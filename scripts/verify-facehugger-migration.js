#!/usr/bin/env node
const Knex = require('knex');

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  const client = dbUrl.startsWith('mysql') ? 'mysql2' : dbUrl.startsWith('postgres') ? 'pg' : null;
  const knex = Knex({ client, connection: dbUrl });
  try {
    const legacySpace = await knex('xenomorphs').count('* as c').where({ pathway: 'space_jockey', stage: 'facehugger' }).first();
    const newSpace = await knex('xenomorphs').count('* as c').where({ pathway: 'space_jockey', stage: 'space_jockey_facehugger' }).first();
    const legacyAny = await knex('xenomorphs').count('* as c').where('stage', 'facehugger').first();
    const totalUpdated = await knex('xenomorphs').count('* as c').where('stage', 'like', '%_facehugger').first();

    console.log('space_jockey: legacy facehugger count =', legacySpace.c);
    console.log('space_jockey: new space_jockey_facehugger count =', newSpace.c);
    console.log('any pathway: remaining literal "facehugger" stage count =', legacyAny.c);
    console.log('any pathway: total *_facehugger stage count =', totalUpdated.c);
  } catch (err) {
    console.error(err);
    process.exitCode = 2;
  } finally {
    try { await knex.destroy(); } catch (e) {}
  }
}

main();
