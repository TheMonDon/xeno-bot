const Knex = require('knex');
const knexfile = require('../knexfile');
const fs = require('fs');
const path = require('path');

async function main() {
  const env = process.env.NODE_ENV || 'production';
  const cfg = knexfile[env] || knexfile.production;
  const knex = Knex(cfg);

  try {
    const shopPath = path.resolve(__dirname, '../config/shop.json');
    if (!fs.existsSync(shopPath)) {
      console.error('config/shop.json not found. Aborting.');
      process.exit(2);
    }
    const shop = JSON.parse(fs.readFileSync(shopPath, 'utf8')) || {};
    const items = (shop.items || []).map(i => i.id).filter(Boolean);
    if (!items.length) {
      console.log('No shop items found in config. Nothing to remove.');
      await knex.destroy();
      process.exit(0);
    }

    console.log(`Found ${items.length} shop item(s) to remove from users: ${items.join(', ')}`);

    const rows = await knex('users').select('id', 'data');
    let updated = 0;
    let totalRemoved = 0;
    for (const r of rows) {
      let data = null;
      try { data = r.data ? JSON.parse(r.data) : {}; } catch (e) { data = {}; }
      if (!data || !data.guilds) continue;
      let changed = false;
      for (const gid of Object.keys(data.guilds || {})) {
        const g = data.guilds[gid] || {};
        if (g.items && typeof g.items === 'object') {
          for (const it of items) {
            if (Object.prototype.hasOwnProperty.call(g.items, it)) {
              totalRemoved += Number(g.items[it] || 0) || 0;
              delete g.items[it];
              changed = true;
            }
          }
          // if items object is now empty, remove it entirely
          if (Object.keys(g.items || {}).length === 0) delete g.items;
        }
      }
      if (changed) {
        await knex('users').where({ id: r.id }).update({ data: JSON.stringify(data), updated_at: knex.fn.now() });
        updated += 1;
      }
    }

    console.log(`Cleanup complete. Updated ${updated} user(s). Removed a total of ${totalRemoved} item(s).`);
    await knex.destroy();
    process.exit(0);
  } catch (err) {
    console.error('Cleanup failed:', err && (err.stack || err));
    try { await knex.destroy(); } catch (_) { /* ignore */ }
    process.exit(1);
  }
}

main();
