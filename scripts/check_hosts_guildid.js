#!/usr/bin/env node
/*
  Script: check_hosts_guildid.js
  Usage: node scripts/check_hosts_guildid.js
  Checks the `hosts` table for rows missing `guild_id`.
*/
const path = require('path');
const db = require(path.join(__dirname, '..', 'src', 'db'));

async function run() {
    try {
      // Ensure DB/schema initialized (createKnex lazily)
      await db.migrate();
      const knex = db.knex;
      const hasHosts = await knex.schema.hasTable('hosts');
    if (!hasHosts) {
      console.log('No hosts table found.');
      process.exit(0);
    }

      const hasGuildCol = await knex.schema.hasColumn('hosts', 'guild_id');
    if (!hasGuildCol) {
      console.log('`hosts.guild_id` column does not exist on this DB.');
      process.exit(0);
    }

      const [{ cnt } = { cnt: 0 }] = await knex('hosts').whereRaw("guild_id IS NULL OR guild_id = ''").count('* as cnt');
      const missing = Number(cnt || 0);
    if (missing === 0) {
      console.log('All hosts have guild_id.');
      process.exit(0);
    }

    console.warn(`Found ${missing} hosts without guild_id.`);
    // Print sample rows (up to 10)
    const rows = await knex('hosts').whereRaw("guild_id IS NULL OR guild_id = ''").limit(10);
    console.log('Sample rows:');
    rows.forEach(r => console.log(JSON.stringify(r)));
    process.exit(2);
  } catch (e) {
    console.error('Failed checking hosts.guild_id:', e && e.message);
    process.exit(3);
  } finally {
    // Destroy knex pool
    try { await knex.destroy(); } catch (_) { /* ignore */ }
  }
}

run();
