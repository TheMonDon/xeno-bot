const os = require('os');
const process = require('process');
const { getCommandConfig } = require('../../utils/commandsConfig');
const db = require('../../db');
const fallbackLogger = require('../../utils/fallbackLogger');
const { execSync } = require('child_process');
const pkg = require('../../../package.json');
const discord = require('discord.js');
const safeReply = require('../../utils/safeReply');

const cmd = getCommandConfig('info') || {
  name: 'info',
  description: 'Show system, tech, and global stats.'
};

const logger = require('../../utils/logger').get('command:info');

// Track soft uptime and loop count
global._softUptimeStart = global._softUptimeStart || Date.now();
global._loopCount = global._loopCount || 0;

module.exports = {
  name: cmd.name,
  description: cmd.description,
  data: { name: cmd.name, description: cmd.description },
  async executeInteraction(interaction) {
    const { EmbedBuilder } = require('discord.js');
    // System
    const osVersion = `${os.type()} ${os.release()}-${os.arch()}`;
    let pythonVersion = 'N/A';
    try {
      pythonVersion = execSync('python3 --version').toString().trim().replace('Python ', '');
    } catch (e) { try { logger.warn('Failed detecting python version for info command', { error: e && (e.stack || e) }); } catch (le) { fallbackLogger.warn('Failed logging python detection error for info command', le && (le.stack || le)); } }
    const discordjsVersion = (discord && discord.version) || pkg.dependencies['discord.js'] || 'unknown';
    const cpuUsage = (os.loadavg()[0] / os.cpus().length * 100).toFixed(1) + '%';
    const ramUsage = ((process.memoryUsage().rss / os.totalmem()) * 100).toFixed(1) + '%';

    // runtime client info
    const client = interaction.client;
    const botUser = client && client.user ? `${client.user.tag} (${client.user.id})` : 'unknown';
    const clientGuilds = client && client.guilds && client.guilds.cache ? client.guilds.cache.size : 'unknown';
    const clientUsers = client && client.users && client.users.cache ? client.users.cache.size : 'unknown';
    const clientChannels = client && client.channels && client.channels.cache ? client.channels.cache.size : 'unknown';
    const gatewayPing = client && client.ws && typeof client.ws.ping === 'number' ? `${client.ws.ping} ms` : 'n/a';
    const intents = (client && client.options && client.options.intents) ? String(client.options.intents) : 'n/a';

    // Tech
    const hardUptimeMs = os.uptime() * 1000;
    const softUptimeMs = Date.now() - global._softUptimeStart;
    function fmt(ms) {
      const s = Math.floor(ms / 1000) % 60;
      const m = Math.floor(ms / 60000) % 60;
      const h = Math.floor(ms / 3600000) % 24;
      const d = Math.floor(ms / 86400000);
      return `${d}d ${h}h ${m}m ${s}s`;
    }
    let lastUpdate = 'unknown';
    try {
      const git = execSync('git log -1 --format=%ct').toString().trim();
      const last = Number(git) * 1000;
      lastUpdate = fmt(Date.now() - last);
    } catch (e) { try { logger.warn('Failed getting last git update for info command', { error: e && (e.stack || e) }); } catch (le) { fallbackLogger.warn('Failed logging git update error for info command', le && (le.stack || le)); } }
    const loops = ++global._loopCount;
    const shardCount = client && client.shard && typeof client.shard.count === 'number' ? client.shard.count : (client && client.options && client.options.shards ? client.options.shards : 'n/a');
    const shardIds = client && client.shard && Array.isArray(client.shard.ids) ? client.shard.ids.join(',') : (client && client.options && client.options.shards ? String(client.options.shards) : 'n/a');

    // Global Stats
    let guilds = clientGuilds, dbProfiles = 'unknown', dbUsers = clientUsers, dbChannels = clientChannels;
    try {
      const g = await db.knex('guild_settings').count('* as c').first();
      guilds = g && (g.c ?? g['count(*)']) ? g.c || g['count(*)'] : '0';
    } catch (e) { try { logger.warn('Failed querying guild count for info command', { error: e && (e.stack || e) }); } catch (le) { fallbackLogger.warn('Failed logging guild count query error for info command', le && (le.stack || le)); } }
    try {
      const p = await db.knex('profiles').count('* as c').first();
      dbProfiles = p && (p.c ?? p['count(*)']) ? p.c || p['count(*)'] : '0';
    } catch (e) { try { logger.warn('Failed querying profiles count for info command', { error: e && (e.stack || e) }); } catch (le) { fallbackLogger.warn('Failed logging profiles count query error for info command', le && (le.stack || le)); } }
    try {
      const u = await db.knex('users').count('* as c').first();
      dbUsers = u && (u.c ?? u['count(*)']) ? u.c || u['count(*)'] : '0';
    } catch (e) { try { logger.warn('Failed querying users count for info command', { error: e && (e.stack || e) }); } catch (le) { fallbackLogger.warn('Failed logging users count query error for info command', le && (le.stack || le)); } }
    try {
      const c = await db.knex('channels').count('* as c').first();
      dbChannels = c && (c.c ?? c['count(*)']) ? c.c || c['count(*)'] : '0';
    } catch (e) { try { logger.warn('Failed querying channels count for info command', { error: e && (e.stack || e) }); } catch (le) { fallbackLogger.warn('Failed logging channels count query error for info command', le && (le.stack || le)); } }

    // Build a compact markdown info output using **key**: value style
    const lines = [];
    lines.push('**System**:');
    lines.push(`**OS**: ${osVersion}`);
    lines.push(`**Node**: ${process.version}`);
    lines.push(`**discord.js**: ${discordjsVersion}`);
    lines.push(`**Python**: ${pythonVersion}`);
    lines.push(`**CPU**: ${cpuUsage}`);
    lines.push(`**RAM**: ${ramUsage}`);
    lines.push('');
    lines.push('**Tech**:');
    lines.push(`**Hard uptime**: ${fmt(hardUptimeMs)}`);
    lines.push(`**Soft uptime**: ${fmt(softUptimeMs)}`);
    lines.push(`**Last update**: ${lastUpdate}`);
    lines.push(`**Loops**: ${loops}`);
    lines.push(`**Shards**: ${shardCount}`);
    lines.push(`**Shard IDs**: ${shardIds}`);
    lines.push(`**Gateway ping**: ${gatewayPing}`);
    lines.push(`**Intents**: ${intents}`);
    lines.push('');
    lines.push('**Global Stats**:');
    lines.push(`**Guilds (cache)**: ${clientGuilds}`);
    lines.push(`**Guilds (db)**: ${guilds}`);
    lines.push(`**DB Profiles**: ${dbProfiles}`);
    lines.push(`**Users (cache)**: ${clientUsers}`);
    lines.push(`**Users (db)**: ${dbUsers}`);
    lines.push(`**Channels (cache)**: ${clientChannels}`);
    lines.push(`**Channels (db)**: ${dbChannels}`);
    lines.push('');
    lines.push('**Client**:');
    lines.push(`**User**: ${botUser}`);
    lines.push(`**Version**: ${pkg.version || 'unknown'}`);

    const content = lines.join('\n');
    await safeReply(interaction, { content, ephemeral: cmd.ephemeral === true }, { loggerName: 'command:info' });
  }
};
