export type PaymentProviderConfig = {
  displayProviderName: string;
  displayMerchantName: string;
  // Raw ABA/KHQR base payload string (from ABA app). Used to generate scannable QR.
  abaKhqrBasePayload?: string;
  // Optional: show a fixed QR image (fallback).
  abaQrImageUrl?: string;
};

export const getPaymentConfig = (): PaymentProviderConfig => {
  const env = import.meta.env as any;
  return {
    displayProviderName: String(env.VITE_PAYMENT_PROVIDER_NAME || 'ABA PAY'),
    displayMerchantName: String(env.VITE_PAYMENT_MERCHANT_NAME || 'TinhMe'),
    abaKhqrBasePayload: env.VITE_ABA_KHQR_BASE_PAYLOAD ? String(env.VITE_ABA_KHQR_BASE_PAYLOAD).trim() : undefined,
    abaQrImageUrl: env.VITE_ABA_QR_IMAGE_URL ? String(env.VITE_ABA_QR_IMAGE_URL).trim() : undefined,
  };
};
