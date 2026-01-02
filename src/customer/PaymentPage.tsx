import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../components/customer/CartContext';
import { clearUserCart, createOrderAndDecrementStock } from '../services/firestoreService';
import { OrderStatus, User } from '../types';
import { calcCartTotals, calcDiscountedUnitPrice, formatPromotionPercentBadge, normalizePromotionPercent } from '../services/pricing';
import { getPaymentConfig } from '../services/paymentConfig';
import QRCode from 'qrcode';
import { buildAbaKhqrPayload } from '../services/abaKhqr';

type Props = {
  user: User | null;
  onRequireAuth?: (redirectTo: string) => void;
};

const fmtMoney = (n: number) => `$${n.toFixed(2)}`;
const fmtNumber = (n: number) => n.toFixed(2);

const PaymentPage: React.FC<Props> = ({ user, onRequireAuth }) => {
  const navigate = useNavigate();
  const { cart, hydrateCart } = useCart();
  const { originalSubtotal, discountedSubtotal, discountTotal } = useMemo(() => calcCartTotals(cart), [cart]);
  const fee = 0;
  const total = discountedSubtotal + fee;

  const paymentCfg = useMemo(() => getPaymentConfig(), []);

  const [busy, setBusy] = useState(false);

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrError, setQrError] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<number>(() => Date.now() + 3 * 60 * 1000);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const [showBankForm, setShowBankForm] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [transferReference, setTransferReference] = useState('');
  const [bankFormError, setBankFormError] = useState<string>('');

  // Generate a payment QR when config allows. To avoid fake/static images,
  // we only render a QR generated from a KHQR base payload.
  useEffect(() => {
    let alive = true;
    const make = async () => {
      setQrError('');
      setQrDataUrl('');

      // Prefer dynamic KHQR payload with amount when a base payload exists.
      const base = paymentCfg.abaKhqrBasePayload;
      const amount = total > 0 ? fmtNumber(total) : undefined;

      try {
        if (base) {
          const payload = buildAbaKhqrPayload({ basePayload: base, amount, dynamic: true });
          const url = await QRCode.toDataURL(payload, { margin: 1, width: 320 });
          if (alive) setQrDataUrl(url);
          return;
        }
        if (alive) setQrError('Payment QR is not configured yet.');
      } catch (e: any) {
        if (alive) setQrError(String(e?.message || 'Could not generate payment QR.'));
      }
    };

    void make();
    return () => {
      alive = false;
    };
  }, [paymentCfg, total]);

  // Countdown timer (3 minutes) for the QR.
  useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 500);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    // Reset expiry when cart total changes.
    setExpiresAt(Date.now() + 3 * 60 * 1000);
  }, [total]);

  const expiresText = useMemo(() => {
    const ms = Math.max(0, expiresAt - nowMs);
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  }, [expiresAt, nowMs]);

  const onPay = async (method: 'BANK') => {
    if (!user) {
      if (onRequireAuth) onRequireAuth('/payment');
      return;
    }
    if (!cart.length) return;

    const ok = confirm('Confirm you have completed the payment?');
    if (!ok) return;

    setBusy(true);
    try {
      const nowIso = new Date().toISOString();
      const cleanAccount = accountNumber.replace(/\s+/g, '');
      const accountLast4 = cleanAccount.length >= 4 ? cleanAccount.slice(-4) : '';
      const accountMasked = cleanAccount ? `****${accountLast4}` : '';

      try {
        await createOrderAndDecrementStock({
        userId: user.id,
        date: nowIso,
        status: OrderStatus.PENDING,
        paymentStatus: 'PAID',
        paymentMethod: method,
        paidAt: nowIso,
        paymentDetails:
          method === 'BANK'
            ? {
                bankName: bankName.trim() || undefined,
                accountHolderName: accountHolderName.trim() || undefined,
                accountLast4: accountLast4 || undefined,
                accountMasked: accountMasked || undefined,
                transferReference: transferReference.trim() || undefined,
              }
            : undefined,
        total,
        items: cart.map((i) => ({
          productId: i.id,
          name: i.name,
          price: Number(calcDiscountedUnitPrice(i.price, i.promotionPercent).toFixed(2)),
          originalPrice: i.price,
          promotionPercent: normalizePromotionPercent(i.promotionPercent),
          quantity: i.quantity,
          image: i.image,
        })),
        });
      } catch (e: any) {
        const msg = String(e?.message || 'Payment could not be completed.');
        alert(msg);
        return;
      }

      hydrateCart([]);
      void clearUserCart(user.id).catch(() => {});

      navigate('/orders', { state: { toast: { message: 'Payment successful', type: 'success' } } });
    } finally {
      setBusy(false);
    }
  };

  const validateBankForm = () => {
    const cleanAccount = accountNumber.replace(/\s+/g, '');
    const cleanConfirm = confirmAccountNumber.replace(/\s+/g, '');

    if (!bankName.trim()) return 'Please enter bank name.';
    if (!accountHolderName.trim()) return 'Please enter account holder name.';
    if (!/^\d{6,20}$/.test(cleanAccount)) return 'Account number must be 6–20 digits.';
    if (cleanAccount !== cleanConfirm) return 'Account number does not match confirmation.';
    return '';
  };

  const onConfirmBankPayment = async () => {
    const err = validateBankForm();
    setBankFormError(err);
    if (err) return;

    const ok = confirm('Confirm the bank account details are correct and you have completed the transfer?');
    if (!ok) return;
    await onPay('BANK');
  };

  if (!cart.length) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-center text-2xl font-semibold mb-6">Payment</h1>
        <p className="text-center text-gray-600 mb-8">Your cart is empty.</p>
        <div className="flex justify-center gap-3">
          <Link className="px-4 py-2 rounded-lg border border-gray-200" to="/shop">Go to Shop</Link>
          <Link className="px-4 py-2 rounded-lg border border-gray-200" to="/">Back Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-[calc(100vh-72px)]">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-2">
            {/* Left: QR */}
            <div className="px-10 py-10 bg-white flex flex-col items-center">
              <div className="text-lg font-semibold text-gray-700 mb-8">Scan to Pay</div>

              <div className="w-full max-w-[340px] rounded-2xl bg-white shadow-md border border-gray-100 overflow-hidden">
                {/* Top brand strip */}
                <div className="h-20 bg-red-600 flex items-center justify-center">
                  <div className="text-white font-extrabold tracking-widest">KHQR</div>
                </div>

                {/* Merchant + amount */}
                <div className="px-7 pt-6 pb-4">
                  <div className="text-sm text-gray-700 font-medium truncate">{paymentCfg.displayMerchantName}</div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-gray-900">{fmtNumber(total)}</span>
                    <span className="text-sm text-gray-500">USD</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-gray-200" />

                {/* QR (KHQR generated only) */}
                <div className="px-7 py-7 flex items-center justify-center">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Payment QR"
                      className="w-64 h-64 object-contain"
                      onError={(e) => {
                        const img = e.currentTarget as HTMLImageElement;
                        img.src = 'https://via.placeholder.com/320x320?text=QR';
                      }}
                    />
                  ) : (
                    <div className="w-64 h-64 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-sm text-gray-500">
                      {qrError || 'Generating QR…'}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-10 text-gray-400 font-semibold">Expires in: {expiresText}</div>

              <div className="mt-8">
                <Link to="/cart" className="text-sm text-gray-400 underline">Back to Cart</Link>
              </div>

              {paymentCfg.abaKhqrBasePayload && (
                <div className="mt-6 text-xs text-gray-400">
                  KHQR generated from merchant payload · dynamic amount
                </div>
              )}
            </div>

            {/* Right: Summary + bank option */}
            <div className="px-10 py-10 self-start sticky top-6 h-fit">
              <h2 className="text-3xl font-semibold text-gray-700 mb-10">Transaction Summary</h2>

              <div className="space-y-7 max-w-md">
                <div className="flex items-center justify-between text-gray-500">
                  <span className="text-lg">Subtotal</span>
                  <span className="text-lg text-gray-800 font-medium">{fmtMoney(originalSubtotal)}</span>
                </div>

                {discountTotal > 0 && (
                  <div className="flex items-center justify-between text-gray-500">
                    <span className="text-lg">Promotion</span>
                    <span className="text-lg text-gray-800 font-medium">-{fmtMoney(discountTotal)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-gray-500">
                  <span className="text-lg">Fee</span>
                  <span className="text-lg text-gray-800 font-medium">{fmtMoney(fee)}</span>
                </div>

                <div className="flex items-center justify-between text-gray-900">
                  <span className="text-xl font-semibold">Total</span>
                  <span className="text-xl text-gray-900 font-semibold">{fmtMoney(total)}</span>
                </div>

                <div className="pt-8">
                  <div className="h-px bg-gray-200" />
                </div>

                <div className="pt-6">
                  <div className="text-center text-sm text-gray-400 mb-6">You can also pay with the options below</div>
                  <button
                    type="button"
                    className="w-full rounded-full bg-black text-white hover:bg-gray-900 transition font-semibold py-4"
                    onClick={() => setShowBankForm((v) => !v)}
                    disabled={busy}
                  >
                    {busy ? 'PROCESSING…' : (showBankForm ? 'HIDE BANK FORM' : 'ENTER BANK ACCOUNT')}
                  </button>

                  {showBankForm && (
                    <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-4">
                      <div className="text-sm font-semibold text-gray-700 mb-3">Bank Transfer Details</div>

                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Bank name</label>
                          <input
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            placeholder="e.g. ABA Bank"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Account holder name</label>
                          <input
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                            value={accountHolderName}
                            onChange={(e) => setAccountHolderName(e.target.value)}
                            placeholder="Name on bank account"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Account number</label>
                          <input
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                            placeholder="Digits only"
                            inputMode="numeric"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Confirm account number</label>
                          <input
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                            value={confirmAccountNumber}
                            onChange={(e) => setConfirmAccountNumber(e.target.value)}
                            placeholder="Re-enter account number"
                            inputMode="numeric"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Transfer reference / Transaction ID (optional)</label>
                          <input
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                            value={transferReference}
                            onChange={(e) => setTransferReference(e.target.value)}
                            placeholder="e.g. ABA TXN123456"
                          />
                        </div>
                      </div>

                      {bankFormError && <div className="mt-3 text-xs text-red-600">{bankFormError}</div>}

                      <button
                        type="button"
                        className="mt-4 w-full rounded-full bg-black text-white font-semibold py-3"
                        onClick={onConfirmBankPayment}
                        disabled={busy}
                      >
                        {busy ? 'PROCESSING…' : 'CONFIRM BANK PAYMENT'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
