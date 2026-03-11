#!/usr/bin/env node
// Dry-run (and optional apply) for fixing literal `standard_facehugger` values
// Usage:
//   node scripts/dry_run_fix_standard_facehugger.js          # dry run
//   node scripts/dry_run_fix_standard_facehugger.js --apply  # apply changes

// Use a smaller pool for ad-hoc scripts to avoid exhausting DB connections
process.env.DB_POOL_MAX = process.env.DB_POOL_MAX || '6';
const db = require('../src/db');

function parseArgs() {
  const args = process.argv.slice(2);
  return { apply: args.includes('--apply') };
}

function safeParseData(raw) {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return null;
  }
}

(async function main() {
  const args = parseArgs();
  let knex;
  try {
    await db.migrate();
    knex = db.knex;

    const rows = await knex('xenomorphs')
      .select('id','owner_id','pathway','role','stage','data')
      .where(function() {
        this.where('role', 'standard_facehugger').orWhere('stage', 'standard_facehugger');
      });

    if (!rows.length) {
      console.log('No rows found with literal "standard_facehugger".');
      return;
    }

    console.log(`Found ${rows.length} row(s) with "standard_facehugger":`);

    const plans = rows.map(r => {
      const plan = { id: r.id, owner_id: r.owner_id, pathway: r.pathway, changes: {}, data_note: null };
      if (r.role === 'standard_facehugger') plan.changes.role = 'facehugger';
      if (r.stage === 'standard_facehugger') plan.changes.stage = 'facehugger';
      if (!r.pathway) plan.changes.pathway = 'standard';

      const parsed = safeParseData(r.data);
      if (parsed === null) {
        plan.data_note = 'data JSON parse failed; will replace with marker if applying';
      } else {
        parsed._migrations = parsed._migrations || {};
        parsed._migrations.standard_facehugger_fix = true;
        plan.data_note = 'will tag data._migrations.standard_facehugger_fix = true';
        plan.new_data = JSON.stringify(parsed);
      }

      return plan;
    });

    for (const p of plans) {
      console.log(`- id=${p.id}, owner=${p.owner_id}, pathway=${p.pathway || 'null'}`);
      for (const [k,v] of Object.entries(p.changes)) console.log(`    ${k}: -> ${v}`);
      console.log(`    note: ${p.data_note}`);
    }

    if (!args.apply) {
      console.log('\nDry run complete. Re-run with --apply to perform updates.');
      return;
    }

    console.log('\nApplying updates...');

    let applied = 0;
    for (const p of plans) {
      try {
        await knex.transaction(async trx => {
          const updates = Object.assign({}, p.changes);
          if (p.new_data) updates.data = p.new_data;
          else if (p.data_note && p.data_note.includes('replace with marker')) updates.data = JSON.stringify({ _migrations: { standard_facehugger_fix: true } });
          if (Object.keys(updates).length === 0) return;
          updates.updated_at = knex.fn.now();
          const affected = await trx('xenomorphs').where({ id: p.id }).update(updates);
          if (affected && affected > 0) applied++;
        });
      } catch (e) {
        console.error(`Failed updating id=${p.id}:`, e && (e.stack || e));
      }
    }

    console.log(`Done. Applied updates: ${applied}`);
  } catch (e) {
    console.error('Script failed:', e && (e.stack || e));
    process.exitCode = 2;
  } finally {
    try {
      if (knex && typeof knex.destroy === 'function') await knex.destroy();
    } catch (e) { /* ignore */ }
  }
})();
