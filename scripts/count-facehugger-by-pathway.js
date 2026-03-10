#!/usr/bin/env node
const Knex = require('knex');

(async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  const client = dbUrl.startsWith('mysql') ? 'mysql2' : dbUrl.startsWith('postgres') ? 'pg' : null;
  const knex = Knex({ client, connection: dbUrl });
  try {
    const rows = await knex('xenomorphs').select('pathway').count('* as c').where({ stage: 'facehugger' }).groupBy('pathway').orderBy('c', 'desc');
    console.log('Counts of stage="facehugger" grouped by pathway:');
    for (const r of rows) console.log(`- ${r.pathway || 'null'}: ${r.c}`);
  } catch (e) {
    console.error(e && (e.stack || e));
    process.exitCode = 2;
  } finally {
    try { await knex.destroy(); } catch (e) { /* ignore */ }
  }
})();
