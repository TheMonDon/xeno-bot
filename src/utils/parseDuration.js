// parseDuration(value)
// - accepts a number (milliseconds) and returns it
// - accepts strings like '1w', '7d', '3h', '30m', '45s', or combined '1w2d3h30m'
// - returns number of milliseconds or null for invalid input
function parseDuration(value) {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return Number(value);
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    if (/^[0-9]+$/.test(s)) return Number(s); // plain digits interpreted as ms
    const regex = /([0-9]+)\s*(w|d|h|m|s|ms)/g;
    let match;
    let total = 0;
    let found = false;
    while ((match = regex.exec(s)) !== null) {
      found = true;
      const n = Number(match[1]);
      const unit = match[2];
      switch (unit) {
        case 'w': total += n * 7 * 24 * 60 * 60 * 1000; break;
        case 'd': total += n * 24 * 60 * 60 * 1000; break;
        case 'h': total += n * 60 * 60 * 1000; break;
        case 'm': total += n * 60 * 1000; break;
        case 's': total += n * 1000; break;
        case 'ms': total += n; break;
        default: break;
      }
    }
    return found ? total : null;
  }
  return null;
}

module.exports = parseDuration;
