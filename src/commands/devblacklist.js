const logger = require('../utils/logger').get('command:devblacklist');

function resolveOwnerId() {
  try {
    if (process.env.BOT_CONFIG_PATH) {
      try { const bc = require(process.env.BOT_CONFIG_PATH); if (bc && bc.owner) return String(bc.owner); } catch (e) {}
    }
  } catch (e) {}
  return process.env.OWNER || process.env.BOT_OWNER || process.env.OWNER_ID || null;
}

module.exports = {
  name: 'devblacklist',
  description: 'Developer-only: manage global leaderboard blacklist — text mode removed; use /devmenu',
  developerOnly: true
};
