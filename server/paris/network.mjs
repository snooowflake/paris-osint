const ipNumber = (ip) => {
  const p = ip.split('.');
  if (p.length !== 4 || p.some((x) => !/^\d{1,3}$/.test(x) || Number(x) > 255))
    return null;
  return p.reduce((n, x) => (n * 256 + Number(x)) >>> 0, 0);
};
export function privateAddress(value) {
  const ip = value.replace(/^::ffff:/, '');
  const n = ipNumber(ip);
  return (
    ip === '::1' ||
    (n !== null &&
      (n >>> 24 === 10 ||
        n >>> 24 === 127 ||
        n >>> 20 === 0xac1 ||
        n >>> 16 === 0xc0a8))
  );
}
export function vpnAddress(value, cidrs = []) {
  const ip = (value || '').replace(/^::ffff:/, '');
  if (ip === '::1') return true;
  const n = ipNumber(ip);
  if (n === null) return false;
  if (n >>> 24 === 127) return true;
  return cidrs.some((c) => {
    const [network, prefix] = c.trim().split('/'),
      base = ipNumber(network),
      bits = Number(prefix);
    if (
      base === null ||
      !Number.isInteger(bits) ||
      bits < 8 ||
      bits > 32 ||
      !privateAddress(network)
    )
      return false;
    const mask = (0xffffffff << (32 - bits)) >>> 0;
    return (n & mask) === (base & mask);
  });
}
