const safeReply = require('../utils/safeReply');

const cmd = {
  name: 'attach-host',
  description: 'Developer-only: attach an existing host to a guild (set guild_id)',
  developerOnly: true
};

function resolveOwnerId() {
  return process.env.OWNER || process.env.BOT_OWNER || process.env.OWNER_ID || null;
}

module.exports = {
  name: `admin:${cmd.name}`,
  description: cmd.description,
  developerOnly: true,
  data: {
    name: 'admin-attach-host',
    description: cmd.description,
    options: [
      { name: 'user', description: 'User who owns the host(s)', type: 6, required: false },
      { name: 'host_id', description: 'Host ID to attach (autocomplete)', type: 4, required: false, autocomplete: true },
      { name: 'unattached', description: 'Attach all hosts for the user that lack a server ID', type: 5, required: false },
      { name: 'guild_id', description: 'Guild ID to set (defaults to current server)', type: 3, required: false }
    ]
  },
  async autocomplete(interaction) {
    try {
      const focusedNamed = interaction.options.getFocused ? interaction.options.getFocused(true) : null;
      if (!focusedNamed || focusedNamed.name !== 'host_id') return interaction.respond([]);

      const targetUser = (() => { try { return interaction.options.getUser('user') || interaction.user; } catch (_) { return interaction.user; } })();
      const userId = targetUser && targetUser.id ? String(targetUser.id) : null;
      if (!userId) return interaction.respond([]);

      const db = require('../db');
      await db.migrate();
      const knex = db.knex;

      const rows = await knex('hosts')
        .where({ owner_id: String(userId) })
        .orderBy('id', 'asc')
        .limit(100)
        .select('id', 'host_type', 'guild_id');

      const items = (rows || []).map(r => ({
        id: Number(r.id),
        name: `${r.host_type} [#${r.id}] ${r.guild_id ? '• attached' : '• unattached'}`.substring(0, 100)
      }));

      const autocomplete = require('../utils/autocomplete');
      return autocomplete(interaction, items, { map: it => ({ name: it.name, value: Number(it.id) }), max: 25 });
    } catch (e) {
      try { return interaction.respond([]); } catch (_) { return; }
    }
  },
  async executeInteraction(interaction) {
    const ownerId = resolveOwnerId();
    if (ownerId && String(interaction.user.id) !== String(ownerId)) {
      await safeReply(interaction, { content: 'This command is developer-only.', ephemeral: true }, { loggerName: 'command:admin-attach-host' });
      return;
    }
    const targetUser = (() => { try { return interaction.options.getUser('user') || interaction.user; } catch (_) { return interaction.user; } })();
    const hostIdRaw = (() => { try { return interaction.options.getInteger('host_id'); } catch (_) { try { return interaction.options.getString('host_id'); } catch (_) { return null; } } })();
    const hostId = hostIdRaw ? Number(hostIdRaw) : null;
    const attachAll = (() => { try { return Boolean(interaction.options.getBoolean('unattached')); } catch (_) { return false; } })();
    const providedGuild = (() => { try { return interaction.options.getString('guild_id'); } catch (_) { return null; } })();
    const guildId = providedGuild || interaction.guildId || null;

    if (!guildId) {
      await safeReply(interaction, { content: '`guild_id` is required (or run the command in a guild).', ephemeral: true }, { loggerName: 'command:admin-attach-host' });
      return;
    }

    if (!hostId && !attachAll) {
      await safeReply(interaction, { content: 'Provide a `host_id` or set `unattached` to true to attach all unattached hosts.', ephemeral: true }, { loggerName: 'command:admin-attach-host' });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const db = require('../db');
      await db.migrate();
      const knex = db.knex;

      const ownerIdStr = targetUser && targetUser.id ? String(targetUser.id) : null;
      if (!ownerIdStr) {
        await safeReply(interaction, { content: 'Could not determine target user.', ephemeral: true }, { loggerName: 'command:admin-attach-host' });
        return;
      }

      if (hostId) {
        const row = await knex('hosts').where({ id: Number(hostId), owner_id: ownerIdStr }).first();
        if (!row) {
          await safeReply(interaction, { content: `Host id ${hostId} not found for that user.`, ephemeral: true }, { loggerName: 'command:admin-attach-host' });
          return;
        }
        let parsed = {};
        if (row.data) {
          try { parsed = typeof row.data === 'string' ? JSON.parse(row.data) : row.data; } catch (e) { parsed = {}; }
        }
        parsed.guild_id = String(guildId);
        await knex('hosts').where({ id: Number(hostId) }).update({ guild_id: String(guildId), data: Object.keys(parsed).length ? JSON.stringify(parsed) : null });
        await safeReply(interaction, { content: `Attached host ${hostId} to guild ${guildId}.`, ephemeral: true }, { loggerName: 'command:admin-attach-host' });
        return;
      }

      if (attachAll) {
        const rows = await knex('hosts')
          .where({ owner_id: ownerIdStr })
          .andWhere(function () { this.whereNull('guild_id').orWhere('guild_id', ''); })
          .select('id', 'data');

        if (!rows || rows.length === 0) {
          await safeReply(interaction, { content: 'No unattached hosts found for that user.', ephemeral: true }, { loggerName: 'command:admin-attach-host' });
          return;
        }

        let updated = 0;
        for (const r of rows) {
          try {
            let parsed = {};
            if (r.data) {
              try { parsed = typeof r.data === 'string' ? JSON.parse(r.data) : r.data; } catch (e) { parsed = {}; }
            }
            parsed.guild_id = String(guildId);
            await knex('hosts').where({ id: r.id }).update({ guild_id: String(guildId), data: Object.keys(parsed).length ? JSON.stringify(parsed) : null });
            updated++;
          } catch (e) {
            // continue on error
          }
        }
        await safeReply(interaction, { content: `Attached ${updated} host(s) to guild ${guildId}.`, ephemeral: true }, { loggerName: 'command:admin-attach-host' });
        return;
      }
    } catch (e) {
      await safeReply(interaction, { content: `Failed to attach host(s): ${e && e.message ? e.message : e}`, ephemeral: true }, { loggerName: 'command:admin-attach-host' });
    }
  }
};
