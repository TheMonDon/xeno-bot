const db = require('../db');
const utils = require('../utils');
const cache = utils.enhancedCache;
const { parseJSON } = utils.jsonParse;
const userDefaults = require('../../config/userDefaults.json');
const logger = utils.logger.get('models:user');

// Cache users for 2 minutes to reduce database load
const USER_CACHE_TTL = 120000;
const FALLBACK_GUILD_DEFAULTS = { eggs: { classic: 1 }, items: {}, currency: { royal_jelly: 0 } };
const FALLBACK_GLOBAL_DEFAULTS = { currency: { credits: 0 } };

function getGuildDefaults() {
  if (userDefaults && userDefaults.guildDefaults) return userDefaults.guildDefaults;
  return FALLBACK_GUILD_DEFAULTS;
}

function getGlobalDefaults() {
  if (userDefaults && userDefaults.globalDefaults) return userDefaults.globalDefaults;
  return FALLBACK_GLOBAL_DEFAULTS;
}

function cloneGuildDefaults(guildDefaults) {
  const gd = guildDefaults || FALLBACK_GUILD_DEFAULTS;
  return {
    eggs: Object.assign({}, gd.eggs || FALLBACK_GUILD_DEFAULTS.eggs),
    items: Object.assign({}, gd.items || {}),
    currency: Object.assign({}, gd.currency || FALLBACK_GUILD_DEFAULTS.currency),
  };
}

function normalizeBucket(currentValue, defaultValue) {
  if (currentValue && typeof currentValue === 'object') return currentValue;
  return Object.assign({}, defaultValue || {});
}

function normalizeGuildData(guildData, guildDefaults) {
  return {
    eggs: normalizeBucket(guildData && guildData.eggs, guildDefaults.eggs || FALLBACK_GUILD_DEFAULTS.eggs),
    items: normalizeBucket(guildData && guildData.items, guildDefaults.items || {}),
    currency: normalizeBucket(guildData && guildData.currency, guildDefaults.currency || FALLBACK_GUILD_DEFAULTS.currency),
  };
}

function ensureGuildState(data, guildId) {
  const gd = getGuildDefaults();
  if (!data.guilds || typeof data.guilds !== 'object') data.guilds = {};

  const existing = data.guilds[guildId];
  const baseGuild = (existing && typeof existing === 'object') ? existing : cloneGuildDefaults(gd);
  const guildData = normalizeGuildData(baseGuild, gd);

  data.guilds[guildId] = guildData;
  return guildData;
}

function ensureGlobalCurrency(data) {
  const globalDefaults = getGlobalDefaults();
  if (!data.currency || typeof data.currency !== 'object') {
    data.currency = Object.assign({}, globalDefaults.currency || FALLBACK_GLOBAL_DEFAULTS.currency);
  }
  return data.currency;
}

async function ensureWritableUser(discordId) {
  let user = await findOrCreate(discordId, {});
  if (user) return user;

  await createUser(discordId, {});
  return getUserByDiscordId(discordId);
}

function applyCatchStats(data, catchTimeMs) {
  data.stats = data.stats || {};
  data.stats.catches = (data.stats.catches || 0) + 1;

  if (catchTimeMs === null) return;

  data.stats.catchTimes = data.stats.catchTimes || [];
  data.stats.catchTimes.push(catchTimeMs);
  if (data.stats.catchTimes.length > 1000) data.stats.catchTimes.shift();
  if (catchTimeMs <= 2000) {
    data.stats.purrfect = (data.stats.purrfect || 0) + 1;
  }
}

async function recordEggCatchSafe(guildId, eggTypeId, discordId, eggs) {
  try {
    const eggModel = require('./egg');
    if (typeof eggModel.recordEggCatch === 'function') {
      await eggModel.recordEggCatch(guildId, eggTypeId, discordId, eggs);
      return;
    }
    await eggModel.incrementEggCaught(guildId, eggTypeId, eggs);
  } catch (e) {
    logger.error('Failed to increment egg caught in DB', { error: e.stack || e });
  }
}

function getCurrencyValue(data, guildId, currencyKey) {
  if (currencyKey === 'credits') {
    if (!data.currency) return 0;
    return Number(data.currency[currencyKey] || 0);
  }

  if (!data.guilds) return 0;
  const guildData = data.guilds[guildId];
  if (!guildData || !guildData.currency) return 0;
  return Number(guildData.currency[currencyKey] || 0);
}

async function getUserByDiscordId(discordId) {
  const cacheKey = `user:${discordId}`;
  
  // Try cache first
  return await cache.getOrCompute(cacheKey, async () => {
    const row = await db.knex('users').where({ discord_id: discordId }).first();
    if (!row) return null;
    const data = parseJSON(row.data, null, `user:${discordId}.data`);
    return { id: row.id, discord_id: row.discord_id, data, created_at: row.created_at, updated_at: row.updated_at };
  }, USER_CACHE_TTL);
}

async function createUser(discordId, initialData = {}) {
  const defaults = { guilds: {}, stats: {} };
  const globalDefaults = getGlobalDefaults();
  const dataToStore = Object.assign({}, defaults, initialData || {});
  dataToStore.guilds = dataToStore.guilds || {};
  // set global currency defaults
  dataToStore.currency = Object.assign({}, globalDefaults.currency || { credits: 0 });
  try {
    // Use an idempotent insert to avoid race conditions where two processes
    // attempt to create the same user simultaneously. For SQLite/Postgres
    // this will ignore the insert if `discord_id` already exists.
    await db.knex('users').insert({ discord_id: discordId, data: JSON.stringify(dataToStore) }).onConflict('discord_id').ignore();
    // Evict any stale null that was cached from the earlier "user not found" lookup
    // so the next getUserByDiscordId call always hits the DB.
    cache.del(`user:${discordId}`);
    const created = await getUserByDiscordId(discordId);
    if (created) logger.info('Created or found existing user', { discordId, id: created.id });
    return created;
  } catch (err) {
    // Handle potential race condition where another process created the user
    const msg = (err && (err.stack || err.message || '')).toString();
    if (msg.includes('UNIQUE constraint failed') || msg.includes('unique constraint') || (err && err.code === 'SQLITE_CONSTRAINT')) {
      logger.warn('Attempted to create user but discord_id already exists; returning existing user', { discordId, error: msg });
      return getUserByDiscordId(discordId);
    }
    logger.error('Failed to create user', { discordId, error: msg });
    throw err;
  }
}

async function updateUserData(discordId, newData) {
  const updated = await db.knex('users').where({ discord_id: discordId }).update({ data: JSON.stringify(newData), updated_at: db.knex.fn.now() });
  if (!updated) return null;
  
  // Invalidate cache after update
  cache.del(`user:${discordId}`);
  
  return getUserByDiscordId(discordId);
}

async function findOrCreate(discordId, defaults = {}) {
  let user = await getUserByDiscordId(discordId);
  if (user) return user;
  // Attempt to create the user and refetch with a few retries to handle
  // race conditions and transient DB/cache issues.
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await createUser(discordId, defaults);
    } catch (e) {
      // Log and continue to refetch; createUser handles unique constraint races.
      logger.warn('createUser attempt failed', { discordId, attempt, error: e && (e.stack || e) });
    }
    // Evict any stale null before re-fetching so we always hit the DB.
    cache.del(`user:${discordId}`);
    user = await getUserByDiscordId(discordId);
    if (user) return user;
    // Small backoff before retrying
    await new Promise((res) => setTimeout(res, 50 * attempt));
  }
  return null;
}

async function updateUserDataRawById(userId, newData) {
  try {
    await db.knex('users').where({ id: userId }).update({ data: JSON.stringify(newData), updated_at: db.knex.fn.now() });
    
    // Invalidate cache - need to get discord_id from database
    const row = await db.knex('users').where({ id: userId }).select('discord_id').first();
    if (row) {
      cache.del(`user:${row.discord_id}`);
    }
  } catch (err) {
    logger.error('Failed to update user data (raw)', { userId, error: err.stack || err });
    throw err;
  }
}


// Add eggs to a user's inventory for a guild, per egg type, and track stats
async function addEggsForGuild(discordId, guildId, eggs, eggTypeId, catchTimeMs = null) {
  let user = await ensureWritableUser(discordId);
  if (!user) {
    // Failed to create/rescue a user; log and avoid throwing to keep spawn
    // processing resilient. Return 0 so callers can handle absence.
    logger.error('Failed to resolve or create user during addEggsForGuild', { discordId, guildId });
    return 0;
  }
  const data = user.data || {};
  const guildData = ensureGuildState(data, guildId);
  const eggDelta = Number(eggs || 1);
  guildData.eggs[eggTypeId] = (guildData.eggs[eggTypeId] || 0) + eggDelta;

  applyCatchStats(data, catchTimeMs);
  await recordEggCatchSafe(guildId, eggTypeId, discordId, eggDelta);
  try {
    await updateUserDataRawById(user.id, data);
  } catch (e) {
    logger.error('Failed to persist user egg update', { discordId, guildId, error: e.stack || e });
    throw e;
  }
  return guildData.eggs[eggTypeId];
}
// Get stats for a user
function getUserStats(user) {
  const stats = (user?.data?.stats) || {};
  const catches = stats.catches || 0;
  const catchTimes = stats.catchTimes || [];
  const purrfect = stats.purrfect || 0;
  let fastest = null, slowest = null, avg = null;
  if (catchTimes.length > 0) {
    fastest = Math.min(...catchTimes);
    slowest = Math.max(...catchTimes);
    avg = catchTimes.reduce((a, b) => a + b, 0) / catchTimes.length;
  }
  return {
    catches,
    fastest,
    slowest,
    avg,
    purrfect
  };
}


async function getGuildStats(discordId, guildId) {
  const user = await getUserByDiscordId(discordId);
  if (!user) return { eggs: 0 };
  const data = user.data || {};
  const g = (data.guilds && data.guilds[guildId]) || { eggs: 0 };
  return { eggs: Number(g.eggs || 0) };
}

// Get all users (for leaderboard)
async function getAllUsers() {
  const rows = await db.knex('users').select('discord_id', 'data');
  return rows.map(row => ({ discord_id: row.discord_id, data: row.data ? JSON.parse(row.data) : {} }));
}

// Add a generic item to a user's inventory for a guild
async function addItemForGuild(discordId, guildId, itemId, quantity = 1) {
  const user = await ensureWritableUser(discordId);
  if (!user) throw new Error('User not found');
  const data = user.data || {};
  const guildData = ensureGuildState(data, guildId);
  guildData.items[itemId] = (guildData.items[itemId] || 0) + Number(quantity || 1);
  await updateUserDataRawById(user.id, data);
  return guildData.items[itemId];
}

// Remove eggs from a user's inventory for a guild. Throws if insufficient eggs.
async function removeEggsForGuild(discordId, guildId, eggId, quantity = 1) {
  const user = await getUserByDiscordId(discordId);
  if (!user) throw new Error('User not found');
  const data = user.data || {};
  const guildData = ensureGuildState(data, guildId);
  const cur = Number(guildData.eggs[eggId] || 0);
  const qty = Number(quantity || 1);
  if (cur < qty) throw new Error('Insufficient eggs');
  const newQty = cur - qty;
  if (newQty <= 0) {
    delete guildData.eggs[eggId];
  } else {
    guildData.eggs[eggId] = newQty;
  }
  await updateUserDataRawById(user.id, data);
  return newQty;
}

// Remove an item from a user's inventory for a guild. Throws if insufficient quantity.
async function removeItemForGuild(discordId, guildId, itemId, quantity = 1) {
  const user = await getUserByDiscordId(discordId);
  if (!user) throw new Error('User not found');
  const data = user.data || {};
  const guildData = ensureGuildState(data, guildId);
  const cur = Number(guildData.items[itemId] || 0);
  const qty = Number(quantity || 1);
  if (cur < qty) throw new Error('Insufficient items');
  const newQty = cur - qty;
  if (newQty <= 0) {
    delete guildData.items[itemId];
  } else {
    guildData.items[itemId] = newQty;
  }
  await updateUserDataRawById(user.id, data);
  return newQty;
}

// Modify currency (delta can be negative). Returns new amount.
async function modifyCurrencyForGuild(discordId, guildId, currencyKey, delta = 0) {
  // Ensure user exists; prefer findOrCreate which handles concurrency
  let user = await ensureWritableUser(discordId);
  if (!user) {
    // As a last resort, attempt to create directly and fetch again
    try {
      await createUser(discordId, {});
      user = await getUserByDiscordId(discordId);
    } catch (e) {
      // If user still cannot be resolved, throw a clear error
      const err = new Error(`Failed to resolve or create user ${discordId}`);
      err.cause = e;
      throw err;
    }
  }
  const data = (user && user.data) || {};

  // credits are global -- store under data.currency
  if (currencyKey === 'credits') {
    const globalCurrency = ensureGlobalCurrency(data);
    const curVal = Number(globalCurrency[currencyKey] || 0);
    const newVal = curVal + Number(delta);
    globalCurrency[currencyKey] = newVal;
    await updateUserDataRawById(user.id, data);
    return newVal;
  }

  const guildData = ensureGuildState(data, guildId);
  const curVal = Number(guildData.currency[currencyKey] || 0);
  const newVal = curVal + Number(delta);
  guildData.currency[currencyKey] = newVal;
  await updateUserDataRawById(user.id, data);
  return newVal;
}

async function getCurrencyForGuild(discordId, guildId, currencyKey) {
  const user = await getUserByDiscordId(discordId);
  if (!user) return 0;
  return getCurrencyValue(user.data || {}, guildId, currencyKey);
}

module.exports = {
  getUserByDiscordId,
  createUser,
  updateUserData,
  updateUserDataRawById,
  findOrCreate,
  addEggsForGuild,
  addItemForGuild,
  removeEggsForGuild,
  modifyCurrencyForGuild,
  getCurrencyForGuild,
  getGuildStats,
  getUserStats,
  removeItemForGuild,
  getAllUsers
};



