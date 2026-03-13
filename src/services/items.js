const shopConfig = require('../../config/shop.json');
const userModel = require('../models/user');

function findItem(query) {
  const q = String(query || '').toLowerCase().trim();
  if (!q) return null;
  const items = (shopConfig.items || []);
  let found = items.find(i => String(i.id).toLowerCase() === q);
  if (found) return found;
  found = items.find(i => (i.name || '').toLowerCase() === q);
  if (found) return found;
  found = items.find(i => (i.name || '').toLowerCase().includes(q));
  if (found) return found;
  found = items.find(i => String(i.id).toLowerCase().includes(q));
  return found || null;
}

// Given an inventory object (map of keys->qty) and an item descriptor, try to
// determine which key the item is stored under. Returns { key, qty } or { key: null, qty: 0 }
function resolveInventoryKey(inv = {}, item) {
  if (!inv || typeof inv !== 'object') return { key: null, qty: 0 };
  const idKey = item && item.id ? String(item.id) : null;
  if (idKey && Number(inv[idKey] || 0) > 0) return { key: idKey, qty: Number(inv[idKey]) };

  const nameKey = item && item.name ? String(item.name) : null;
  if (nameKey && Number(inv[nameKey] || 0) > 0) return { key: nameKey, qty: Number(inv[nameKey]) };

  // Try normalized variants: lowercase + strip spaces
  const normTargets = [];
  if (idKey) normTargets.push(String(idKey).toLowerCase().replace(/\s+/g, ''));
  if (nameKey) normTargets.push(String(nameKey).toLowerCase().replace(/\s+/g, ''));

  const matching = Object.keys(inv || {}).find(k => {
    const kk = String(k || '').toLowerCase().replace(/\s+/g, '');
    return normTargets.includes(kk) || normTargets.some(t => kk === t);
  });
  if (matching) return { key: matching, qty: Number(inv[matching] || 0) };
  return { key: null, qty: 0 };
}

async function consumeItemForUser(userId, guildId, itemQueryOrId, amount = 1) {
  const item = typeof itemQueryOrId === 'object' && itemQueryOrId && itemQueryOrId.id ? itemQueryOrId : findItem(itemQueryOrId);
  if (!item) return { success: false, error: 'Item not found', item: null };
  // Fetch fresh user data
  const user = await userModel.getUserByDiscordId(String(userId));
  if (!user) return { success: false, error: 'User not found', item };
  const g = (user.data && user.data.guilds && user.data.guilds[guildId]) || {};
  const inv = (g.items && typeof g.items === 'object') ? g.items : {};
  const resolved = resolveInventoryKey(inv, item);
  if (!resolved.key || Number(resolved.qty || 0) < Number(amount || 1)) return { success: false, error: 'Insufficient items', item, key: resolved.key };
  try {
    await userModel.removeItemForGuild(String(userId), guildId, resolved.key, amount);
    return { success: true, item, key: resolved.key };
  } catch (err) {
    return { success: false, error: err && err.message ? err.message : String(err), item, key: resolved.key };
  }
}

async function restoreItemForUser(userId, guildId, invKey, amount = 1) {
  try {
    await userModel.addItemForGuild(String(userId), guildId, invKey, amount);
    return { success: true };
  } catch (err) {
    return { success: false, error: err && err.message ? err.message : String(err) };
  }
}

module.exports = {
  findItem,
  resolveInventoryKey,
  consumeItemForUser,
  restoreItemForUser
};
