function bcdBits(digit) {
  if (!Number.isInteger(digit) || digit < 0 || digit > 9) {
    throw new RangeError(`digit out of range 0-9: ${digit}`);
  }
  return [(digit >> 3) & 1, (digit >> 2) & 1, (digit >> 1) & 1, digit & 1];
}
function bitsToDigit(w, x, y, z) {
  return (w << 3) | (x << 2) | (y << 1) | z;
}
export function encodeDeclet(d2, d1, d0) {
  const [a, b, c, d] = bcdBits(d2);
  const [e, f, g, h] = bcdBits(d1);
  const [i, j, k, m] = bcdBits(d0);

  const p = b | (a & j) | (a & f & i);
  const q = c | (a & k) | (a & g & i);
  const r = d;
  const s = (f & ((1 - a) | (1 - i))) | ((1 - a) & e & j) | (e & i);
  const t = g | ((1 - a) & e & k) | (a & i);
  const u = h;
  const v = a | e | i;
  const w2 = a | (e & i) | ((1 - e) & j);
  const x2 = e | (a & i) | ((1 - a) & k);
  const y = m;

  return (p << 9) | (q << 8) | (r << 7) | (s << 6) | (t << 5) | (u << 4) | (v << 3) | (w2 << 2) | (x2 << 1) | y;
}
export function decodeDeclet(declet) {
  if (!Number.isInteger(declet) || declet < 0 || declet > 1023) {
    throw new RangeError(`declet out of range 0-1023: ${declet}`);
  }
  const p = (declet >> 9) & 1, q = (declet >> 8) & 1, r = (declet >> 7) & 1,
        s = (declet >> 6) & 1, t = (declet >> 5) & 1, u = (declet >> 4) & 1,
        v = (declet >> 3) & 1, w = (declet >> 2) & 1, x = (declet >> 1) & 1,
        y = declet & 1;

  const a = (v & w) & ((1 - s) | t | (1 - x));
  const b = p & ((1 - v) | (1 - w) | (s & (1 - t) & x));
  const c = q & ((1 - v) | (1 - w) | (s & (1 - t) & x));
  const d = r;
  const e = v & (((1 - w) & x) | ((1 - t) & x) | (s & x));
  const f = (s & ((1 - v) | (1 - x))) | (p & (1 - s) & t & v & w & x);
  const g = (t & ((1 - v) | (1 - x))) | (q & (1 - s) & t & w);
  const h = u;
  const i = v & (((1 - w) & (1 - x)) | (w & x & (s | t)));
  const j = ((1 - v) & w) | (s & v & (1 - w) & x) | (p & w & ((1 - x) | ((1 - s) & (1 - t))));
  const k = ((1 - v) & x) | (t & (1 - w) & x) | (q & v & w & ((1 - x) | ((1 - s) & (1 - t))));
  const m = y;

  return [bitsToDigit(a, b, c, d), bitsToDigit(e, f, g, h), bitsToDigit(i, j, k, m)];
}