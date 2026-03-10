const { ActionRowBuilder } = require('discord.js');
const { buildLinkButtons } = require('../../utils/buttonBuilder');
const { getCommandConfig } = require('../../utils/commandsConfig');
const links = require('../../../config/links.json');
const pageLinks = links.general || links;

const cmd = getCommandConfig('vote') || {
  name: 'vote',
  description: 'Vote for the bot on top.gg.'
};

module.exports = {
  name: cmd.name,
  description: cmd.description,
  requiredPermissions: cmd.requiredPermissions,
  hidden: cmd.hidden === true,
  ephemeral: cmd.ephemeral === true,
  data: { name: cmd.name, description: cmd.description },
  async executeInteraction(interaction) {
    const rows = buildLinkButtons({ vote: pageLinks.vote }, { logger: console });
    const safeReply = require('../../utils/safeReply');
    await safeReply(interaction, { content: 'Support the bot by voting!', components: rows, ephemeral: false }, { loggerName: 'command:vote' });
  }
};
