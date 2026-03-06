const util = require('util');
const logger = require('../../utils/logger').get('command:deveval');
const fallbackLogger = require('../../utils/fallbackLogger');

// Simple blacklist for dangerous patterns. This is intentionally conservative.
const BLACKLIST = [
  /\brequire\s*\(/i,
  /\bchild_process\b/i,
  /\bprocess\.exit\b/i,
  /\bprocess\.env\b/i,
  /\bfs\./i,
  /\bspawn\b/i,
  /\bexec\b/i,
  /\bwhile\s*\(\s*true\s*\)/i,
  /for\s*\(\s*;;\s*\)/i
];

module.exports = {
  name: 'deveval',
  description: 'Developer-only: evaluate JS (owner only) — text mode removed; use /devmenu',
  developerOnly: true
};
