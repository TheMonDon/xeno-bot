module.exports = require('./cache/batchLoader');

// Example usage in models:
/*
const BatchLoader = require('../utils/batchLoader');
const db = require('../db');

// Create a loader for batching user lookups
const userLoader = new BatchLoader(async (discordIds) => {
  const rows = await db.knex('users')
    .whereIn('discord_id', discordIds)
    .select('*');
  
  // Map results by discord_id
  const map = {};
  rows.forEach(row => {
    map[row.discord_id] = row;
  });
  return map;
}, {
  maxBatchSize: 100,
  batchDelayMs: 10,
  cache: true
});

// In your code, instead of:
// const user = await db.knex('users').where({ discord_id: id }).first();
// Use:
// const user = await userLoader.load(id);

// Multiple calls within 10ms will be batched into a single query:
// const [user1, user2, user3] = await Promise.all([
//   userLoader.load('123'),
//   userLoader.load('456'),
//   userLoader.load('789')
// ]);
// ^ This becomes just: SELECT * FROM users WHERE discord_id IN ('123', '456', '789')
*/
