#!/usr/bin/env node
/*
  Backfill script: attach `guild_id` to hosts rows that are missing it
  Usage: node scripts/backfill-hosts-guildid.js
*/
const path = require('path');

async function main() {
  try {
    const db = require('../src/db');
    await db.migrate();
    const knex = db.knex;
    if (!knex) {
      console.error('Failed to obtain knex instance');
      process.exit(2);
    }

    console.log('Querying hosts rows with missing guild_id...');
    const rows = await knex('hosts').where(function () {
      this.whereNull('guild_id').orWhere('guild_id', '');
    }).select('id', 'owner_id', 'data');

    if (!rows || rows.length === 0) {
      console.log('No hosts found with missing guild_id. Nothing to do.');
      process.exit(0);
    }

    let updated = 0;
    let skipped = 0;
    const failures = [];

    for (const r of rows) {
      try {
        let parsed = {};
        if (r.data) {
          try { parsed = typeof r.data === 'string' ? JSON.parse(r.data) : r.data; } catch (e) { parsed = {}; }
        }
        const gid = parsed && (parsed.guild_id || parsed.guildId || parsed.guild) ? (parsed.guild_id || parsed.guildId || parsed.guild) : null;
        if (gid) {
          await knex('hosts').where({ id: r.id }).update({ guild_id: String(gid) });
          updated++;
        } else {
          skipped++;
        }
      } catch (e) {
        failures.push({ id: r.id, error: (e && e.message) || String(e) });
      }
    }

    console.log(`Processed ${rows.length} hosts rows: updated=${updated}, skipped=${skipped}, failures=${failures.length}`);
    if (failures.length) console.error('Failures:', failures.slice(0, 10));
    process.exit(0);
  } catch (e) {
    console.error('Backfill failed', e && (e.stack || e.message || e));
    process.exit(1);
  }
}

if (require.main === module) main();
