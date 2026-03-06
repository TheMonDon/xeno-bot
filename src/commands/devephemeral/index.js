const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require('discord.js');

function resolveOwnerId() {
  try {
    if (process.env.BOT_CONFIG_PATH) {
      try {
        const bc = require(process.env.BOT_CONFIG_PATH);
        if (bc && bc.owner) return String(bc.owner);
      } catch (_) {}
    }
  } catch (_) {}
  return process.env.OWNER || process.env.BOT_OWNER || process.env.OWNER_ID || null;
}

function resolveTesterRoles() {
  try {
    if (process.env.BOT_CONFIG_PATH) {
      try {
        const bc = require(process.env.BOT_CONFIG_PATH);
        if (bc && Array.isArray(bc.testerRoles)) return bc.testerRoles.map(r => String(r));
      } catch (_) {}
    }
  } catch (_) {}
  return [];
}

function isDeveloper(user, member) {
  const ownerId = resolveOwnerId();
  if (ownerId && String(user.id) === String(ownerId)) return true;

  const testerRoles = resolveTesterRoles();
  if (testerRoles.length > 0 && member && member.roles) {
    if (typeof member.roles.has === 'function') {
      return testerRoles.some(roleId => member.roles.has(roleId));
    }
    if (member.roles.cache) {
      return testerRoles.some(roleId => member.roles.cache.has(roleId));
    }
  }

  return false;
}

module.exports = {
  name: 'devephemeral',
  description: 'Developer-only: Components v2 ephemeral test — text mode removed; use /devmenu',
  developerOnly: true
};
