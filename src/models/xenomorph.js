const db = require('../db');
const { parseJSON } = require('../utils/jsonParse');
const { insertWithReusedId } = require('../utils/idReuse');

async function getById(id) {
  const row = await db.knex('xenomorphs').where({ id: Number(id) }).first();
  if (!row) return null;
  row.stats = parseJSON(row.stats, {}, `xeno:${id}.stats`);
  row.data = parseJSON(row.data, {}, `xeno:${id}.data`);
  return row;
}

async function getByIdScoped(id, guildId = null) {
  if (!guildId) return getById(id);
  const row = await db.knex('xenomorphs')
    .leftJoin('hives', 'xenomorphs.hive_id', 'hives.id')
    .where('xenomorphs.id', Number(id))
    .andWhere('hives.guild_id', String(guildId))
    .first('xenomorphs.*');
  if (!row) return null;
  row.stats = parseJSON(row.stats, {}, `xeno:${id}.stats`);
  row.data = parseJSON(row.data, {}, `xeno:${id}.data`);
  return row;
}

async function listByOwner(ownerId, guildId = null, includeUnassigned = false) {
  let q = db.knex('xenomorphs').where({ owner_id: String(ownerId) });
  if (guildId) {
    // Prefer explicit guild_id on xenomorphs when available. Fall back to hive join for older schemas.
    const hasGuildCol = await db.knex.schema.hasColumn('xenomorphs', 'guild_id');
    if (hasGuildCol) {
      if (includeUnassigned) {
        q = q.andWhere(function () {
          this.where('xenomorphs.guild_id', String(guildId)).orWhereNull('xenomorphs.guild_id');
        });
      } else {
        q = q.andWhere('xenomorphs.guild_id', String(guildId));
      }
    } else {
      if (includeUnassigned) {
        // left join so we keep xenos with null hive_id, then filter to those either in the guild or unassigned
        q = q.leftJoin('hives', 'xenomorphs.hive_id', 'hives.id').andWhere(function () {
          this.where('hives.guild_id', String(guildId)).orWhereNull('xenomorphs.hive_id');
        });
      } else {
        // only xenos attached to a hive in the guild
        q = q.join('hives', 'xenomorphs.hive_id', 'hives.id').andWhere('hives.guild_id', String(guildId));
      }
    }
  }
  const rows = await q.orderBy('id', 'asc');
  return rows.map(r => ({ ...r, stats: parseJSON(r.stats, {}), data: parseJSON(r.data, {}) }));
}

async function createXeno(ownerId, opts = {}) {
  const payload = {
    owner_id: String(ownerId),
    hive_id: opts.hive_id || null,
    guild_id: opts.guildId || null,
    pathway: opts.pathway || 'standard',
    role: opts.role || 'egg',
    stage: opts.stage || 'egg',
    level: opts.level || 1,
    stats: opts.stats ? JSON.stringify(opts.stats) : null,
    data: opts.data ? JSON.stringify(opts.data) : null
  };
  // If a guildId is provided and no explicit hive_id was set, try to attach to user's hive in that guild
  if ((!payload.hive_id || payload.hive_id == null) && opts.guildId) {
    try {
      const hiveModel = require('./hive');
      const hive = await hiveModel.getHiveByUser(String(ownerId), String(opts.guildId));
      if (hive && hive.id) payload.hive_id = hive.id;
    } catch (_) {}
  }

  const id = await insertWithReusedId('xenomorphs', payload);
  return getXenoById(id);
}

async function getXenoById(id) {
  const row = await db.knex('xenomorphs').where({ id }).first();
  if (!row) return null;
  row.stats = parseJSON(row.stats, {}, `xeno:${id}.stats`);
  row.data = parseJSON(row.data, {}, `xeno:${id}.data`);
  return row;
}

async function getXenosByOwner(ownerId, guildId = null, includeUnassigned = false) {
  // wrapper around listByOwner for compatibility
  return listByOwner(ownerId, guildId, includeUnassigned);
}

async function deleteXenosByOwner(ownerId) {
  try {
    await db.knex('xenomorphs').where({ owner_id: String(ownerId) }).del();
    return true;
  } catch (e) {
    logger.warn('Failed deleting xenomorphs for owner', { error: e && e.message });
    throw e;
  }
}

module.exports = {
  // canonical names
  createXeno,
  getXenoById,
  getXenosByOwner,
  deleteXenosByOwner,
  // compatibility aliases used by existing commands
  getById,
  getByIdScoped,
  listByOwner
};
