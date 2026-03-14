// formatDuration(ms)
// Converts milliseconds into a human-friendly string like '1w 2d 3h 4m'
function formatDuration(ms) {
  if (ms == null || !Number.isFinite(Number(ms))) return '';
  let remaining = Math.max(0, Number(ms));
  const weeks = Math.floor(remaining / (7 * 24 * 60 * 60 * 1000));
  remaining -= weeks * 7 * 24 * 60 * 60 * 1000;
  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  remaining -= days * 24 * 60 * 60 * 1000;
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  remaining -= hours * 60 * 60 * 1000;
  const minutes = Math.floor(remaining / (60 * 1000));
  remaining -= minutes * 60 * 1000;
  const seconds = Math.floor(remaining / 1000);

  const parts = [];
  if (weeks) parts.push(`${weeks}w`);
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds && parts.length < 2) parts.push(`${seconds}s`); // include seconds only if short
  if (parts.length === 0) return '0s';
  return parts.join(' ');
}

module.exports = formatDuration;
