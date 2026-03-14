#!/usr/bin/env node
const { execSync } = require('child_process');
const net = require('net');
const path = require('path');

function dockerAvailable() {
  try {
    execSync('docker -v', { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

function containerExists(name) {
  try {
    execSync(`docker inspect ${name}`, { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

function containerRunning(name) {
  try {
    const out = execSync(`docker inspect -f '{{.State.Running}}' ${name}`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
    return out === 'true';
  } catch (e) {
    return false;
  }
}

function startNewContainer(name, port) {
  try {
    execSync(`docker run -d --name ${name} -p ${port}:6379 redis:7-alpine`, { stdio: 'inherit' });
    console.info('Started new redis container:', name);
  } catch (e) {
    console.error('Failed to start redis container:', e && e.message ? e.message : e);
  }
}

function startExistingContainer(name) {
  try {
    execSync(`docker start ${name}`, { stdio: 'inherit' });
    console.info('Started existing redis container:', name);
  } catch (e) {
    console.error('Failed to start existing redis container:', e && e.message ? e.message : e);
  }
}

function waitForPort(host, port, timeoutMs) {
  return new Promise((resolve) => {
    const start = Date.now();
    const attempt = () => {
      const socket = new net.Socket();
      let resolved = false;
      socket.setTimeout(1500);
      socket.once('error', () => {
        if (resolved) return;
        resolved = true;
        socket.destroy();
        if (Date.now() - start >= timeoutMs) return resolve(false);
        setTimeout(attempt, 500);
      });
      socket.once('timeout', () => {
        if (resolved) return;
        resolved = true;
        socket.destroy();
        if (Date.now() - start >= timeoutMs) return resolve(false);
        setTimeout(attempt, 500);
      });
      socket.connect(port, host, () => {
        if (resolved) return;
        resolved = true;
        socket.end();
        resolve(true);
      });
    };
    attempt();
  });
}

async function ensure() {
  const name = process.env.REDIS_DOCKER_NAME || 'xeno-redis';
  const port = process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379;
  const host = process.env.REDIS_HOST || '127.0.0.1';

  if (dockerAvailable()) {
    if (containerRunning(name)) {
      console.info('Redis container already running:', name);
    } else if (containerExists(name)) {
      startExistingContainer(name);
    } else {
      startNewContainer(name, port);
    }
  } else {
    console.info('Docker not available; attempting to start local redis-server if present');
    try {
      // Check for redis-server binary
      execSync('command -v redis-server', { stdio: 'ignore' });
      // Start redis-server detached on requested port
      try {
        const { spawn } = require('child_process');
        const child = spawn('redis-server', ['--port', String(port)], {
          detached: true,
          stdio: 'ignore'
        });
        child.unref();
        console.info('Spawned local redis-server process');
      } catch (e) {
        console.error('Failed to spawn local redis-server:', e && e.message ? e.message : e);
      }
    } catch (e) {
      console.info('No docker and no redis-server binary found; skipping auto-start');
      return false;
    }
  }

  const timeoutMs = Number(process.env.AUTO_START_REDIS_TIMEOUT_MS) || 15000;
  const ok = await waitForPort(host, port, timeoutMs);
  if (ok) console.info(`Redis is reachable at ${host}:${port}`);
  else console.warn(`Redis did not become ready at ${host}:${port} within ${timeoutMs}ms`);
  return ok;
}

// Run ensure and exit with non-zero when Redis did not become reachable
(async () => {
  try {
    const ok = await ensure();
    // exit with non-zero code on failure so callers can detect readiness
    process.exit(ok ? 0 : 2);
  } catch (e) {
    // ensure failed catastrophically
    process.exit(2);
  }
})();
