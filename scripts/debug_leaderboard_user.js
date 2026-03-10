const Knex = require('knex');
const knexfile = require('../knexfile');

async function main() {
  const env = process.env.NODE_ENV || 'production';
  const cfg = knexfile[env] || knexfile.production;
  const knex = Knex(cfg);
  try {
    const userId = process.argv[2];
    const guildId = process.argv[3];
    if (!userId) {
      console.error('Usage: node scripts/debug_leaderboard_user.js <discordId> [guildId]');
      process.exit(2);
    }

    const user = await knex('users').where({ discord_id: String(userId) }).first();
    if (!user) {
      console.error('User not found');
      process.exit(1);
    }

    let parsed = null;
    try { parsed = user.data ? JSON.parse(user.data) : {}; } catch (e) { parsed = {}; }
    const guilds = parsed.guilds || {};

    const guildData = guildId ? (guilds[guildId] || null) : null;

    const eggsForGuild = guildData && guildData.eggs ? guildData.eggs : {};
    const eggsForGuildTotal = Object.values(eggsForGuild).reduce((a,b)=>a+ (Number(b)||0),0);

    // Compute global eggs across all guilds in user.data
    let globalEggsTotal = 0;
    for (const [g, gd] of Object.entries(guilds)) {
      try {
        const eggs = gd.eggs || {};
        globalEggsTotal += Object.values(eggs).reduce((a,b)=>a + (Number(b)||0), 0);
      } catch(e) {}
    }

    // Hosts for user (global)
    const hosts = await knex('hosts').where({ owner_id: String(userId) }).select('id','host_type');

    console.log(JSON.stringify({ discord_id: user.discord_id, guildIdProvided: guildId || null, eggsForGuild, eggsForGuildTotal, globalEggsTotal, hostCount: hosts.length, hostsSample: hosts.slice(0,10) }, null, 2));
    await knex.destroy();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err && (err.message || err));
    try { await knex.destroy(); } catch (_) { /* ignore */ }
    process.exit(1);
  }
}

main();
