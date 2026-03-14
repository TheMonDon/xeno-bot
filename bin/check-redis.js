#!/usr/bin/env node
const net = require('net');
const path = require('path');

const urlStr = process.env.REDIS_URL;
let host = process.env.REDIS_HOST || '127.0.0.1';
let port = process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379;
if (urlStr) {
  try {
    const u = new URL(urlStr);
    host = u.hostname || host;
    port = u.port ? Number(u.port) : port;
  } catch (e) {
    // ignore
  }
}

function check(host, port, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    let settled = false;
    sock.setTimeout(timeoutMs);
    sock.once('error', (err) => {
      if (settled) return;
      settled = true;
      sock.destroy();
      resolve(false);
    });
    sock.once('timeout', () => {
      if (settled) return;
      settled = true;
      sock.destroy();
      resolve(false);
    });
    sock.connect(port, host, () => {
      if (settled) return;
      settled = true;
      sock.end();
      resolve(true);
    });
  });
}

(async () => {
  try {
    const ok = await check(host, port, Number(process.env.REDIS_STATUS_TIMEOUT_MS) || 2000);
    if (ok) {
      console.info(`Redis reachable at ${host}:${port}`);
      process.exit(0);
    }
    console.error(`Redis NOT reachable at ${host}:${port}`);
    process.exit(2);
  } catch (e) {
    console.error('Redis status check failed', e && e.message ? e.message : e);
    process.exit(3);
  }
})();
