const IORedis = require('ioredis');
const { spawnSync } = require('child_process');
const net = require('net');
const path = require('path');

// If requested, invoke the Docker helper synchronously so it can block until Redis is ready.
const redisOptions = process.env.REDIS_URL ? process.env.REDIS_URL : {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};


if (process.env.AUTO_START_REDIS === '1') {
  try {
    const helper = path.join(__dirname, '..', 'bin', 'ensure-redis.js');
    // spawnSync will wait for the helper to exit; helper exits non-zero if Redis not reachable
    const res = spawnSync(process.execPath, [helper], { stdio: 'ignore', timeout: Number(process.env.AUTO_START_REDIS_TIMEOUT_MS) || 20_000 });
    if (res && typeof res.status === 'number' && res.status !== 0) {
      // Helper failed to bring Redis up — decide whether to fail fast based on REDIS_REQUIRED
      const redisRequired = String(process.env.REDIS_REQUIRED || '').toLowerCase();
      if (redisRequired === '1' || redisRequired === 'true' || redisRequired === 'yes') {
        // eslint-disable-next-line no-console
        console.error('[redis] AUTO_START_REDIS requested and helper failed; Redis required by REDIS_REQUIRED, exiting');
        process.exit(1);
      }
      // Not required: just warn and continue so local/dev without docker can work
      // eslint-disable-next-line no-console
      console.warn('[redis] AUTO_START_REDIS requested but helper failed to start Redis or Redis not reachable; continuing without Redis because REDIS_REQUIRED is not set');
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[redis] Failed running AUTO_START_REDIS helper', e && (e.stack || e));
    const redisRequired = String(process.env.REDIS_REQUIRED || '').toLowerCase();
    if (redisRequired === '1' || redisRequired === 'true' || redisRequired === 'yes') process.exit(1);
    // otherwise continue without Redis
  }
}

const client = new IORedis(redisOptions);

client.on('error', (err) => {
  // do not crash the process on Redis errors; log instead
  // logging system can be integrated here
  // eslint-disable-next-line no-console
  console.error('[redis] error', err && err.message ? err.message : err);
});

client.on('connect', () => {
  // eslint-disable-next-line no-console
  console.info('[redis] connected');
});

module.exports = client;
