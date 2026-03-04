/*
Migration: convert dog pathway drones to runners.

The dog pathway was updated to evolve facehuggers into runners instead of drones.
This script updates existing dog-pathway drones in the database to runners.

Usage:
  node scripts/migrate-dog-drones-to-runners.js          # dry run
  node scripts/migrate-dog-drones-to-runners.js --apply  # apply changes
*/

const db = require('../src/db');

async function migrate(apply = false) {
  console.log('Running dog drone -> runner migration', apply ? '(APPLY)' : '(DRY RUN)');
  await db.migrate();
  const knex = db.knex;

  // Find all xenomorphs with pathway='dog' and role='drone'
  const dogDrones = await knex('xenomorphs')
    .where({ pathway: 'dog', role: 'drone' })
    .select('id', 'owner_id', 'pathway', 'role', 'stage', 'level');

  console.log(`Found ${dogDrones.length} dog-pathway drones to convert to runners`);

  if (dogDrones.length === 0) {
    console.log('No drones found. Nothing to do.');
    return;
  }

  // Show sample of what will be updated
  console.log('\nSample xenomorphs to update:');
  dogDrones.slice(0, 5).forEach(xeno => {
    console.log(`  - ID ${xeno.id}: owner=${xeno.owner_id}, pathway=${xeno.pathway}, role=${xeno.role} -> runner`);
  });
  if (dogDrones.length > 5) {
    console.log(`  ... and ${dogDrones.length - 5} more`);
  }

  if (apply) {
    console.log('\nApplying changes...');
    const updated = await knex('xenomorphs')
      .where({ pathway: 'dog', role: 'drone' })
      .update({ role: 'runner' });

    console.log(`✅ Successfully updated ${updated} xenomorphs from drone to runner`);
  } else {
    console.log('\n⚠️  DRY RUN: No changes applied. Use --apply to update database.');
  }
}

// Parse CLI args
const apply = process.argv.includes('--apply');

migrate(apply)
  .then(() => {
    console.log('\nMigration complete.');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });
