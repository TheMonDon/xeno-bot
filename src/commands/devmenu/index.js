const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const { addV2TitleWithBotThumbnail } = require('../../utils/componentsV2');

function resolveOwnerId() {
  try {
    if (process.env.BOT_CONFIG_PATH) {
      try { const bc = require(process.env.BOT_CONFIG_PATH); if (bc && bc.owner) return String(bc.owner); } catch (e) {}
    }
  } catch (e) {}
  return process.env.OWNER || process.env.BOT_OWNER || process.env.OWNER_ID || null;
}

// helper actions (duplicate small utilities from previous dev menu)
async function restartSpawnManager(client) {
  const spawnManager = require('../../spawnManager');
  const logger = require('../../utils/logger').get('spawn');
  logger.info('Restarting spawn manager via devmenu');
  if (spawnManager && typeof spawnManager.init === 'function') await spawnManager.init(client);
  return `✅ **Spawn manager restarted**\nAll guild spawn schedules have been recalculated and restored.`;
}

async function clearExpiredSpawns(client) {
  const spawnManager = require('../../spawnManager');
  const logger = require('../../utils/logger').get('spawn');
  logger.info('Clearing expired spawns via devmenu');
  const activeEggs = (spawnManager && spawnManager.activeEggs) || new Map();
  const now = Date.now();
  let cleared = 0;
  for (const [channelId, eggData] of activeEggs.entries()) {
    const spawnedAt = eggData.spawnedAt || 0;
    const elapsed = now - spawnedAt;
    const timeout = 180000;
    if (elapsed > timeout) { activeEggs.delete(channelId); cleared++; }
  }
  logger.info(`Cleared ${cleared} expired spawn(s)`);
  return `✅ **Cleared expired spawns**\n• Removed: **${cleared}** expired egg(s)`;
}

async function syncGuildCache() {
  const cache = require('../../utils/cache');
  const logger = require('../../utils/logger').get('cache');
  logger.info('Syncing guild cache via devmenu');
  if (cache && typeof cache.warmGuildCache === 'function') {
    await cache.warmGuildCache();
    return `✅ **Guild cache synchronized**\nGuild settings have been refreshed from the database.`;
  }
  return `⚠️ **Cache sync unavailable**\nNo warmGuildCache function found in cache module.`;
}

async function forceMigration() {
  const db = require('../../db');
  const logger = require('../../utils/logger').get('migration');
  logger.info('Force running database migration via devmenu');
  if (db && typeof db.migrate === 'function') await db.migrate();
  return `✅ **Database migration complete**\nAll migrations have been applied successfully.`;
}

const pages = ['Main', 'Blacklist / Utilities', 'Maintenance'];
function buildMenu(client, pageIndex = 0) {
  const container = new ContainerBuilder();
  addV2TitleWithBotThumbnail({ container, title: `🛠️ Developer Menu — ${pages[pageIndex] || 'Main'}`, client });
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent('**Interactive Administration Tools**\nSelect an action below to manage server data, debug issues, or run migrations.'));
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

  if (pageIndex === 0) {
    container.addActionRowComponents({ type: 1, components: [
      { type: 2, custom_id: 'devmenu-migrate-facehuggers', label: 'Migrate Legacy Facehuggers', style: 1 },
      { type: 2, custom_id: 'devmenu-restart-hatch', label: 'Restart Hatch Timers', style: 2 },
      { type: 2, custom_id: 'devmenu-restart-spawn', label: 'Restart Spawn Timers', style: 2 }
    ]});
    container.addActionRowComponents({ type: 1, components: [
      { type: 2, custom_id: 'devmenu-clear-spawns', label: 'Clear Expired Spawns', style: 2 },
      { type: 2, custom_id: 'devmenu-sync-cache', label: 'Sync Guild Cache', style: 2 },
      { type: 2, custom_id: 'devmenu-force-migrate', label: 'Force DB Migration', style: 4 }
    ]});
  }

  if (pageIndex === 1) {
    container.addActionRowComponents({ type: 1, components: [
      { type: 2, custom_id: 'devmenu-blacklist-guild', label: 'Blacklist Guild (modal)', style: 1 },
      { type: 2, custom_id: 'devmenu-unblacklist-guild', label: 'Unblacklist Guild (modal)', style: 4 }
    ]});
    container.addActionRowComponents({ type: 1, components: [
      { type: 2, custom_id: 'devmenu-list-blacklist', label: 'List Blacklist', style: 2 },
      { type: 2, custom_id: 'devmenu-reload-commands', label: 'Reload Commands', style: 1 },
      { type: 2, custom_id: 'devmenu-run-gc', label: 'Run GC', style: 2 },
      { type: 2, custom_id: 'devmenu-db-stats', label: 'DB Stats', style: 2 }
    ]});
  }

  if (pageIndex === 2) {
    container.addActionRowComponents({ type: 1, components: [
      { type: 2, custom_id: 'devmenu-restart-hatch', label: 'Restart Hatch Timers', style: 2 },
      { type: 2, custom_id: 'devmenu-restart-spawn', label: 'Restart Spawn Timers', style: 2 },
      { type: 2, custom_id: 'devmenu-force-migrate', label: 'Force DB Migration', style: 4 }
    ]});
    container.addActionRowComponents({ type: 1, components: [
      { type: 2, custom_id: 'devmenu-clear-spawns', label: 'Clear Expired Spawns', style: 2 },
      { type: 2, custom_id: 'devmenu-sync-cache', label: 'Sync Guild Cache', style: 2 }
    ]});
  }

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`_Menu expires after 5 minutes of inactivity_\n\nPage: ${pageIndex + 1}/${pages.length}`));
  container.addActionRowComponents({ type: 1, components: [
    { type: 2, custom_id: 'devmenu-prev', label: '◀ Prev', style: 2 },
    { type: 2, custom_id: 'devmenu-next', label: 'Next ▶', style: 1 },
    { type: 2, custom_id: 'devmenu-close', label: 'Close', style: 4 }
  ]});
  return container;
}

module.exports = {
  name: 'devmenu',
  description: 'Developer-only: interactive menu for admin tools and diagnostics (owner only)',
  developerOnly: true,
  data: { name: 'devmenu', description: 'Developer-only: interactive menu for admin tools and diagnostics (owner only)' },
  async executeInteraction(interaction) {
    const ownerId = resolveOwnerId();
    if (!ownerId || String(interaction.user.id) !== String(ownerId)) {
      try { await interaction.reply({ content: 'This command is owner-only.', ephemeral: true }); } catch (_) {}
      return;
    }

    let currentPage = 0;
    try {
      await interaction.reply({ components: [buildMenu(interaction.client, currentPage)], flags: MessageFlags.IsComponentsV2, ephemeral: false });
    } catch (e) {
      try { await interaction.reply({ content: 'Failed to display developer menu.', ephemeral: true }); } catch (_) {}
      return;
    }

    const sentMessage = await interaction.fetchReply();
    const logger = require('../../utils/logger').get('devmenu');

    const collector = sentMessage.createMessageComponentCollector({
      filter: (i) => {
        if (String(i.user.id) !== String(ownerId)) {
          try { i.reply({ content: 'Only the bot owner can use this menu.', ephemeral: true }).catch(() => {}); } catch (e) {}
          return false;
        }
        return i.customId && i.customId.startsWith('devmenu-');
      },
      idle: 300000
    });

    collector.on('collect', async (i) => {
      const action = i.customId.replace('devmenu-', '');
      try {
        await i.deferUpdate();
        let resultMessage = '';
        let error = false;
        switch (action) {
          case 'prev':
            currentPage = (currentPage - 1 + pages.length) % pages.length;
            await i.update({ components: [buildMenu(interaction.client, currentPage)], flags: MessageFlags.IsComponentsV2 });
            return;
          case 'next':
            currentPage = (currentPage + 1) % pages.length;
            await i.update({ components: [buildMenu(interaction.client, currentPage)], flags: MessageFlags.IsComponentsV2 });
            return;
          case 'close':
            try {
              const expiredContainer = new ContainerBuilder();
              addV2TitleWithBotThumbnail({ container: expiredContainer, title: '🛠️ Developer Menu', client: interaction.client });
              expiredContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent('_Menu closed_'));
              await i.update({ components: [expiredContainer], flags: MessageFlags.IsComponentsV2 });
              collector.stop('closed');
              return;
            } catch (e) { logger.warn('Failed closing menu', { error: e && (e.stack || e) }); }
            break;
          case 'migrate-facehuggers':
            resultMessage = '❌ Migration through slash menu not implemented.';
            break;
          case 'restart-spawn':
            try { resultMessage = await restartSpawnManager(interaction.client); } catch (e) { resultMessage = `❌ Spawn restart failed: ${e.message}`; error = true; logger.error('Spawn manager restart failed', { error: e && (e.stack || e) }); }
            break;
          case 'clear-spawns':
            try { resultMessage = await clearExpiredSpawns(interaction.client); } catch (e) { resultMessage = `❌ Clear spawns failed: ${e.message}`; error = true; logger.error('Clear spawns failed', { error: e && (e.stack || e) }); }
            break;
          case 'sync-cache':
            try { resultMessage = await syncGuildCache(); } catch (e) { resultMessage = `❌ Cache sync failed: ${e.message}`; error = true; logger.error('Guild cache sync failed', { error: e && (e.stack || e) }); }
            break;
          case 'force-migrate':
            try { resultMessage = await forceMigration(); } catch (e) { resultMessage = `❌ Migration failed: ${e.message}`; error = true; logger.error('Force migration failed', { error: e && (e.stack || e) }); }
            break;
          case 'list-blacklist':
            try {
              const lbModel = require('../../models/leaderboardBlacklist');
              const list = await lbModel.getAll();
              const body = Array.isArray(list) && list.length ? list.map(g => `• ${g}`).join('\n') : '_No blacklisted guilds_';
              try { await i.followUp({ content: `**Blacklisted guilds**\n${body}`, ephemeral: true }); } catch (_) {}
              return;
            } catch (e) { resultMessage = `❌ Failed to list blacklist: ${e.message}`; error = true; logger.error('List blacklist failed', { error: e && (e.stack || e) }); }
            break;
          case 'reload-commands':
            try {
              const loader = require('../../commands/loader');
              const commandsPath = require('path').join(__dirname, '..');
              const loaded = loader.loadCommands(commandsPath);
              try { interaction.client.commands.clear(); for (const [name, cmd] of loaded) interaction.client.commands.set(name, cmd); } catch (e) { logger.warn('Failed updating client.commands after reload', { error: e && (e.stack || e) }); }
              resultMessage = `✅ Reloaded ${loaded.size || 0} commands`;
            } catch (e) { resultMessage = `❌ Reload failed: ${e.message}`; error = true; logger.error('Reload commands failed', { error: e && (e.stack || e) }); }
            break;
          case 'run-gc':
            try { const before = process.memoryUsage(); if (typeof global.gc === 'function') global.gc(); const after = process.memoryUsage(); resultMessage = `✅ GC run\n• Heap used: ${Math.round((before.heapUsed/1024/1024)*10)/10}MB -> ${Math.round((after.heapUsed/1024/1024)*10)/10}MB`; } catch (e) { resultMessage = `❌ GC failed: ${e.message}`; error = true; logger.error('GC failed', { error: e && (e.stack || e) }); }
            break;
          case 'db-stats':
            try {
              const db = require('../../db'); const knex = db.knex; const counts = {};
              try { counts.users = (await knex('users').count('* as c')).pop().c; } catch (_) { counts.users = 'N/A'; }
              try { counts.hosts = (await knex('hosts').count('* as c')).pop().c; } catch (_) { counts.hosts = 'N/A'; }
              try { counts.guilds = (await knex('guild_settings').count('* as c')).pop().c; } catch (_) { counts.guilds = 'N/A'; }
              resultMessage = `**DB Stats**\n• Users: ${counts.users}\n• Hosts: ${counts.hosts}\n• Guilds: ${counts.guilds}`;
            } catch (e) { resultMessage = `❌ DB stats failed: ${e.message}`; error = true; logger.error('DB stats failed', { error: e && (e.stack || e) }); }
            break;
          case 'blacklist-guild':
          case 'unblacklist-guild':
            try {
              const modal = new ModalBuilder().setCustomId(action === 'blacklist-guild' ? 'devmenu-blacklist-modal' : 'devmenu-unblacklist-modal').setTitle(action === 'blacklist-guild' ? 'Blacklist Guild (global leaderboard)' : 'Unblacklist Guild (global leaderboard)');
              const input = new TextInputBuilder().setCustomId('guild_id').setLabel('Guild ID (or type "current")').setStyle(TextInputStyle.Short).setPlaceholder('Enter guild ID').setRequired(true);
              modal.addComponents(new ActionRowBuilder().addComponents(input));
              await i.showModal(modal);
              return;
            } catch (e) { resultMessage = `❌ Blacklist action failed: ${e.message}`; error = true; logger.error('Blacklist action failed', { error: e && (e.stack || e) }); }
            break;
          default:
            resultMessage = '❓ Unknown action';
            error = true;
        }

        try { await i.followUp({ content: resultMessage, ephemeral: false }); } catch (e) { logger.error('Failed to send follow-up', { error: e.stack || e }); }
      } catch (e) {
        logger.error('Error processing devmenu action', { action, error: e.stack || e });
        try { await i.followUp({ content: `❌ Error processing action: ${e.message}`, ephemeral: false }); } catch (ignored) {}
      }
    });

    collector.on('end', async () => {
      try {
        const expiredContainer = new ContainerBuilder();
        addV2TitleWithBotThumbnail({ container: expiredContainer, title: '🛠️ Developer Menu', client: interaction.client });
        expiredContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent('**Interactive Administration Tools**\nSelect an action below to manage server data, debug issues, or run migrations.'));
        expiredContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
        expiredContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent('_Menu expired — run `/devmenu` again to reopen_'));
        await sentMessage.edit({ components: [expiredContainer], flags: MessageFlags.IsComponentsV2 });
      } catch (e) { logger.error('Failed to update expired menu', { error: e.stack || e }); }
    });
  }
};
