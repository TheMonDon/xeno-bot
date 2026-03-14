// DataLoader-style batching utility for reducing database queries
// Groups multiple requests for the same resource type into a single batch query

class BatchLoader {
  constructor(batchFn, options = {}) {
    this.batchFn = batchFn;
    this.maxBatchSize = options.maxBatchSize || 100;
    this.batchDelayMs = options.batchDelayMs || 10;
    this.cache = options.cache !== false; // default true
    this.cacheMap = new Map();
    this.queue = [];
    this.timer = null;
  }

  load(key) {
    // Check cache first
    if (this.cache && this.cacheMap.has(key)) {
      return Promise.resolve(this.cacheMap.get(key));
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ key, resolve, reject });
      
      // Schedule batch processing
      if (!this.timer) {
        this.timer = setTimeout(() => this.processBatch(), this.batchDelayMs);
      }
      
      // Process immediately if batch is full
      if (this.queue.length >= this.maxBatchSize) {
        clearTimeout(this.timer);
        this.timer = null;
        this.processBatch();
      }
    });
  }

  loadMany(keys) {
    return Promise.all(keys.map(key => this.load(key)));
  }

  async processBatch() {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.maxBatchSize);
    const keys = batch.map(item => item.key);
    
    try {
      const results = await this.batchFn(keys);
      
      // Map results back to promises
      const resultsMap = new Map();
      if (Array.isArray(results)) {
        results.forEach((result, idx) => {
          resultsMap.set(keys[idx], result);
        });
      } else {
        // If batchFn returns an object/map, use it directly
        Object.entries(results).forEach(([key, value]) => {
          resultsMap.set(key, value);
        });
      }
      
      // Resolve promises and cache results
      batch.forEach(({ key, resolve }) => {
        const result = resultsMap.get(key) || null;
        if (this.cache) {
          this.cacheMap.set(key, result);
        }
        resolve(result);
      });
    } catch (error) {
      // Reject all promises in this batch
      batch.forEach(({ reject }) => reject(error));
    }
    
    // Process remaining queue if any
    if (this.queue.length > 0) {
      this.timer = setTimeout(() => this.processBatch(), this.batchDelayMs);
    }
  }

  clearCache() {
    this.cacheMap.clear();
  }

  prime(key, value) {
    if (this.cache) {
      this.cacheMap.set(key, value);
    }
  }
}

module.exports = BatchLoader;
