const db = require('../db');
const utils = require('../utils');
const logger = utils.logger.get('model:leaderboardBlacklist');

async function getAll() {
  const rows = await db.knex('leaderboard_blacklists').select('guild_id');
  return rows.map(r => String(r.guild_id));
}

async function isBlacklisted(guildId) {
  const row = await db.knex('leaderboard_blacklists').where({ guild_id: String(guildId) }).first();
  return !!row;
}

async function add(guildId) {
  try {
    await db.knex('leaderboard_blacklists').insert({ guild_id: String(guildId) }).onConflict('guild_id').ignore();
    logger.info('Blacklisted guild added', { guildId });
    return true;
  } catch (e) {
    logger.warn('Failed to add blacklist entry', { guildId, error: e && (e.stack || e) });
    return false;
  }
}

async function remove(guildId) {
  try {
    await db.knex('leaderboard_blacklists').where({ guild_id: String(guildId) }).del();
    logger.info('Blacklisted guild removed', { guildId });
    return true;
  } catch (e) {
    logger.warn('Failed to remove blacklist entry', { guildId, error: e && (e.stack || e) });
    return false;
  }
}

module.exports = { getAll, isBlacklisted, add, remove };
