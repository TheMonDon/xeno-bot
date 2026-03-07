exports.up = async function(knex) {
  const exists = await knex.schema.hasTable('xenomorphs');
  if (!exists) return;
  const has = await knex.schema.hasColumn('xenomorphs', 'guild_id');
  if (!has) {
    return knex.schema.alterTable('xenomorphs', (table) => {
      table.string('guild_id').nullable().index();
    });
  }
};

exports.down = async function(knex) {
  const exists = await knex.schema.hasTable('xenomorphs');
  if (!exists) return;
  const has = await knex.schema.hasColumn('xenomorphs', 'guild_id');
  if (has) {
    return knex.schema.alterTable('xenomorphs', (table) => {
      table.dropColumn('guild_id');
    });
  }
};
