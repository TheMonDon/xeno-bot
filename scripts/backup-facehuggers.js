#!/usr/bin/env node
// Backup script: exports all xenomorph rows where role OR stage = 'facehugger'
const fs = require('fs');
const path = require('path');
const Knex = require('knex');

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('ERROR: DATABASE_URL not set. Export it or set it in the environment.');
    process.exit(1);
  }

  const client = dbUrl.startsWith('mysql') ? 'mysql2' : dbUrl.startsWith('postgres') ? 'pg' : null;
  if (!client) {
    console.error('Unsupported DATABASE_URL client. Must be mysql or postgres.');
    process.exit(1);
  }

  const knex = Knex({
    client,
    connection: dbUrl,
    pool: { min: 0, max: 7 },
  });

  try {
    const rows = await knex('xenomorphs')
      .select('*')
      .where(function () {
        this.where('role', 'facehugger').orWhere('stage', 'facehugger');
      });

    const outDir = path.resolve(__dirname, '..', 'backups');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonPath = path.join(outDir, `xenomorphs-facehugger-backup-${ts}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify({ exported_at: new Date().toISOString(), count: rows.length, rows }, null, 2));

    console.log(`Exported ${rows.length} row(s) to ${jsonPath}`);
    console.log('Sample IDs:', rows.slice(0, 10).map(r => r.id));
  } catch (err) {
    console.error('Backup failed:', err);
    process.exitCode = 2;
  } finally {
    try { await knex.destroy(); } catch (e) { /* ignore */ }
  }
}

main();
