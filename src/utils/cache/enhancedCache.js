// Enhanced TTL cache with LRU eviction and size limits for high-scale operations
class EnhancedCache {
  constructor(options = {}) {
    this.map = new Map();
    this.maxSize = options.maxSize || 10000; // Limit cache size to prevent memory leaks
    this.defaultTTL = options.defaultTTL || 300000; // 5 minutes default
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0
    };

    // Try to use Redis-backed cache when available
    this._useRedis = false;
    this._redis = null;
    try {
      // require lazily so environments without Redis still work
      // eslint-disable-next-line global-require, import/no-dynamic-require
      const redisClient = require('../../lib/redis');
      if (redisClient && typeof redisClient.get === 'function') {
        this._redis = redisClient;
        this._useRedis = true;
      }
    } catch (e) {
      // Redis not available; fall back to in-memory
    }
    // local computing markers to prevent stampede within this process
    this._computing = new Map();
  }

  set(key, value, ttlMs) {
    if (this._useRedis && this._redis) {
      try {
        const payload = JSON.stringify({ v: value });
        if (ttlMs && Number(ttlMs) > 0) {
          // PX accepts milliseconds
          this._redis.set(key, payload, 'PX', Number(ttlMs));
        } else {
          this._redis.set(key, payload);
        }
        this.stats.sets++;
        return;
      } catch (e) {
        // fallback to in-memory
      }
    }

    // Enforce size limit with LRU eviction (in-memory fallback)
    if (this.map.size >= this.maxSize && !this.map.has(key)) {
      const firstKey = this.map.keys().next().value;
      this.del(firstKey);
      this.stats.evictions++;
    }

    const ttl = ttlMs || this.defaultTTL;
    const expires = ttl ? Date.now() + ttl : null;
    if (this.map.has(key)) {
      const existing = this.map.get(key);
      clearTimeout(existing.timeout);
    }

    const timeout = ttl ? setTimeout(() => this.map.delete(key), ttl) : null;
    this.map.delete(key);
    this.map.set(key, { value, expires, timeout });
    this.stats.sets++;
  }

  get(key) {
    if (this._useRedis && this._redis) {
      try {
        const raw = this._redis.get(key);
        if (!raw) {
          this.stats.misses++;
          return null;
        }
        return raw.then(s => {
          if (!s) {
            this.stats.misses++;
            return null;
          }
          try {
            const parsed = JSON.parse(s);
            this.stats.hits++;
            return parsed.v;
          } catch (e) {
            this.stats.misses++;
            return null;
          }
        });
      } catch (e) {
        // fall back to memory
      }
    }

    const entry = this.map.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (entry.expires && Date.now() > entry.expires) {
      this.map.delete(key);
      this.stats.misses++;
      return null;
    }

    // Move to end for LRU (touch)
    this.map.delete(key);
    this.map.set(key, entry);
    this.stats.hits++;
    return entry.value;
  }

  // Get or compute - prevents cache stampede for expensive operations
  async getOrCompute(key, computeFn, ttlMs) {
    // First try synchronous get; note that get may return a Promise when using Redis
    const cached = this.get(key);
    if (cached !== null) {
      // if get returned a promise (redis path), await it
      if (cached && typeof cached.then === 'function') return await cached;
      return cached;
    }

    // Prevent stampede in-process
    if (this._computing.has(key)) {
      return this._computing.get(key);
    }

    const promise = (async () => {
      try {
        const result = await computeFn();
        try {
          this.set(key, result, ttlMs);
        } catch (e) {
          // ignore cache set failures
        }
        return result;
      } finally {
        this._computing.delete(key);
      }
    })();

    this._computing.set(key, promise);
    return promise;
  }

  has(key) {
    return this.get(key) !== null;
  }

  del(key) {
    if (this._useRedis && this._redis) {
      try {
        this._redis.del(key).catch(() => {});
        return true;
      } catch (e) {
        // fall back
      }
    }
    const entry = this.map.get(key);
    if (entry) {
      clearTimeout(entry.timeout);
      this.map.delete(key);
      return true;
    }
    return false;
  }

  // Delete all keys matching a pattern (useful for invalidation)
  delPattern(pattern) {
    if (this._useRedis && this._redis) {
      // Use SCAN to avoid blocking
      const streamScan = async () => {
        let cursor = '0';
        const regex = new RegExp(pattern);
        let total = 0;
        do {
          // eslint-disable-next-line no-await-in-loop
          const res = await this._redis.scan(cursor, 'MATCH', '*', 'COUNT', 1000);
          cursor = res[0];
          const keys = res[1] || [];
          const toDel = keys.filter(k => regex.test(k));
          if (toDel.length) {
            // eslint-disable-next-line no-await-in-loop
            await this._redis.del(...toDel);
            total += toDel.length;
          }
        } while (cursor !== '0');
        return total;
      };
      // fire-and-forget but return promise
      return streamScan();
    }

    let deleted = 0;
    const regex = new RegExp(pattern);
    for (const key of this.map.keys()) {
      if (regex.test(key)) {
        this.del(key);
        deleted++;
      }
    }
    return deleted;
  }

  clear() {
    for (const [, v] of this.map.entries()) {
      clearTimeout(v.timeout);
    }
    this.map.clear();
    this.stats = { hits: 0, misses: 0, sets: 0, evictions: 0 };
  }

  size() {
    return this.map.size;
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : 0;
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      size: this.map.size,
      maxSize: this.maxSize
    };
  }

  // Periodic cleanup of expired entries (call this on an interval)
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of this.map.entries()) {
      if (entry.expires && now > entry.expires) {
        this.del(key);
        cleaned++;
      }
    }
    return cleaned;
  }
}

// Export singleton with reasonable defaults for bot use
module.exports = new EnhancedCache({
  maxSize: 10000,  // Cache up to 10k items
  defaultTTL: 300000  // 5 minute default TTL
});

// Also export the class for custom instances
module.exports.EnhancedCache = EnhancedCache;
