import { buildEmvTlv, parseEmvTlvStrict, removeEmvTag, upsertEmvTag, withUpdatedCrc63 } from './emvQr';

export type AbaKhqrBuildInput = {
  // A raw KHQR/ABA payload string from ABA (usually includes tag 63 CRC at the end).
  // You can copy this from your ABA Pay merchant QR.
  basePayload: string;
  // Amount to request (string like "16.00"). If omitted, returns the base payload (CRC normalized).
  amount?: string;
  // If true, forces Point of Initiation Method to "12" (dynamic).
  dynamic?: boolean;
};

const normalizeAmount = (amount?: string): string | undefined => {
  if (amount == null) return undefined;
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  // Most EMV payloads accept plain decimal with 2 digits.
  return n.toFixed(2);
};

export const buildAbaKhqrPayload = (input: AbaKhqrBuildInput): string => {
  const base = String(input.basePayload || '').replace(/\s+/g, '').trim();
  if (!base) throw new Error('Missing ABA KHQR base payload');
  if (!/^\d+$/.test(base) || !base.startsWith('000201')) {
    throw new Error('Invalid ABA/KHQR payload (expected EMV string starting with 000201)');
  }

  // Parse TLVs, remove CRC, then upsert amount (54) if provided.
  let tlvs = removeEmvTag(parseEmvTlvStrict(base), '63');

  const amt = normalizeAmount(input.amount);
  if (amt) {
    tlvs = upsertEmvTag(tlvs, '54', amt);
    // If amount is present, it is typically a dynamic QR.
    if (input.dynamic !== false) tlvs = upsertEmvTag(tlvs, '01', '12');
  }

  const rebuilt = buildEmvTlv(tlvs);
  return withUpdatedCrc63(rebuilt);
};
