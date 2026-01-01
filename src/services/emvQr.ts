// Minimal EMVCo Merchant Presented Mode (MPM) TLV helpers.
// Works generically for KHQR/ABA payloads by parsing ID(2) + LEN(2) + VALUE.

export type EmvTlv = { id: string; value: string };

export const parseEmvTlvStrict = (payload: string): EmvTlv[] => {
  const out: EmvTlv[] = [];
  let i = 0;
  const s = String(payload || '');
  if (!s) throw new Error('Empty EMV payload');

  while (i + 4 <= s.length) {
    const id = s.slice(i, i + 2);
    const lenStr = s.slice(i + 2, i + 4);
    if (!/^\d{2}$/.test(id) || !/^\d{2}$/.test(lenStr)) {
      throw new Error(`Invalid EMV tag header at index ${i}`);
    }
    const len = Number(lenStr);
    const start = i + 4;
    const end = start + len;
    if (end > s.length) {
      throw new Error(`Invalid EMV tag length for ${id} at index ${i}`);
    }
    const value = s.slice(start, end);
    out.push({ id, value });
    i = end;
  }

  if (i !== s.length) {
    throw new Error('Trailing characters in EMV payload');
  }
  if (out.length === 0) throw new Error('Invalid EMV payload');
  return out;
};

export const parseEmvTlv = (payload: string): EmvTlv[] => {
  const out: EmvTlv[] = [];
  let i = 0;
  const s = String(payload || '');

  while (i + 4 <= s.length) {
    const id = s.slice(i, i + 2);
    const lenStr = s.slice(i + 2, i + 4);
    if (!/^\d{2}$/.test(id) || !/^\d{2}$/.test(lenStr)) break;
    const len = Number(lenStr);
    const start = i + 4;
    const end = start + len;
    if (end > s.length) break;
    const value = s.slice(start, end);
    out.push({ id, value });
    i = end;
  }

  return out;
};

export const buildEmvTlv = (items: EmvTlv[]): string => {
  return items
    .map(({ id, value }) => {
      const v = String(value ?? '');
      const len = v.length;
      if (len > 99) throw new Error(`TLV value too long for id ${id}`);
      return `${id}${String(len).padStart(2, '0')}${v}`;
    })
    .join('');
};

export const upsertEmvTag = (items: EmvTlv[], id: string, value: string): EmvTlv[] => {
  const next = items.slice();
  const idx = next.findIndex((t) => t.id === id);
  if (idx >= 0) next[idx] = { id, value };
  else next.push({ id, value });
  return next;
};

export const removeEmvTag = (items: EmvTlv[], id: string): EmvTlv[] => {
  return items.filter((t) => t.id !== id);
};

// CRC16-CCITT (0x1021), init 0xFFFF, output 4 hex uppercase.
export const crc16ccitt = (input: string): string => {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = ((crc << 1) ^ 0x1021) & 0xffff;
      else crc = (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
};

export const withUpdatedCrc63 = (payload: string): string => {
  const base = String(payload || '');
  // Remove any existing CRC tag (63) completely (id+len+value), then append 6304 + CRC.
  const parts = parseEmvTlv(base);
  const without = buildEmvTlv(removeEmvTag(parts, '63'));
  const toCrc = `${without}6304`;
  const crc = crc16ccitt(toCrc);
  return `${toCrc}${crc}`;
};
