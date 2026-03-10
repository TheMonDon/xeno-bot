#!/usr/bin/env node
const path = require('path');
const db = require(path.join(__dirname, '..', 'src', 'db'));

async function main() {
  try {
    console.log('Running migrations...');
    await db.migrate();
    console.log('Migrations complete');
    process.exit(0);
  } catch (e) {
    console.error('Migration failed:', e && (e.stack || e.message));
    process.exit(2);
  }
}

main();
