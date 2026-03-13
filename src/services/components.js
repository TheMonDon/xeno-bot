const safeReply = require('../utils/safeReply');
const { MessageFlags } = require('discord.js');

async function updateInteraction(interaction, payload = {}) {
  // Ensure flags include ComponentsV2 unless caller explicitly set flags
  const p = Object.assign({}, payload);
  if (!Object.prototype.hasOwnProperty.call(p, 'flags')) p.flags = MessageFlags.IsComponentsV2;
  try {
    // Prefer interaction.update when available
    if (interaction && typeof interaction.update === 'function') {
      return await interaction.update(p);
    }
    // Fallback to safeReply which handles replies/edits/followups
    return await safeReply(interaction, p);
  } catch (err) {
    // Final fallback: try safeReply
    try { return await safeReply(interaction, p); } catch (_) { throw err; }
  }
}

async function replyInteraction(interaction, payload = {}, opts = {}) {
  const p = Object.assign({}, payload);
  if (!Object.prototype.hasOwnProperty.call(p, 'flags')) p.flags = MessageFlags.IsComponentsV2;
  return safeReply(interaction, p, opts);
}

module.exports = {
  updateInteraction,
  replyInteraction
};
