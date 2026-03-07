require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');

const baseLogger = console;

async function loadCommands() {
  const commands = [];
  const commandsPath = path.join(__dirname, '..', 'src', 'commands');
  const { getCommandsObject } = require('../src/utils/commandsConfig');
  const commandsConfig = getCommandsObject() || {};

  const isCommandCategory = (catObj) => {
    if (!catObj || typeof catObj !== 'object' || Array.isArray(catObj)) return false;
    const values = Object.values(catObj);
    if (values.length === 0) return false;
    return values.some(v => v && typeof v === 'object' && (Object.prototype.hasOwnProperty.call(v, 'name') || Object.prototype.hasOwnProperty.call(v, 'description')));
  };

  const commandCategories = Object.entries(commandsConfig || {}).filter(([, catObj]) => isCommandCategory(catObj));

  if (fs.existsSync(commandsPath)) {
    try {
      const loader = require(path.join(__dirname, '..', 'src', 'commands', 'loader'));
      const loaded = loader.loadCommands(commandsPath);
      const existingKeys = new Set();
      for (const [name, command] of loaded) {
        existingKeys.add(name);
        if (command && command.data) {
          const d = (typeof command.data.toJSON === 'function') ? command.data.toJSON() : command.data;
          commands.push(d);
        }
      }

      // Validate commands.json entries have corresponding command modules
      for (const [category, catObj] of commandCategories) {
        for (const cmdKey of Object.keys(catObj)) {
          if (!existingKeys.has(cmdKey)) {
            baseLogger.warn(`commands.json entry missing module: ${category}/${cmdKey}`);
          }
        }
      }
    } catch (e) {
      baseLogger.warn('Failed to load commands via loader; falling back to flat-scan', e && (e.stack || e));
      const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
      for (const file of commandFiles) {
        try {
          const command = require(path.join(commandsPath, file));
          if (command.data) commands.push((typeof command.data.toJSON === 'function') ? command.data.toJSON() : command.data);
        } catch (innerErr) {
          baseLogger.warn('Failed to require command during fallback deploy scan', file, innerErr && (innerErr.stack || innerErr));
        }
      }
    }
  }
  return commands;
}

function putToTopgg(clientId, topggToken, commands) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ commands });
    const opts = {
      hostname: 'top.gg',
      path: `/api/projects/${encodeURIComponent(clientId)}/commands`,
      method: 'PUT',
      headers: {
        'Authorization': topggToken,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(opts, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => raw += chunk);
      res.on('end', () => {
        const code = res.statusCode || 0;
        if (code >= 200 && code < 300) {
          resolve({ status: code, body: raw });
        } else {
          reject(new Error(`top.gg API returned ${code}: ${raw}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(body);
    req.end();
  });
}

(async () => {
  try {
    const clientId = process.env.CLIENT_ID;
    const topggToken = process.env.TOPGG_TOKEN || process.env.TOPGG_API_TOKEN;

    if (!clientId) {
      baseLogger.error('CLIENT_ID not set in environment. Set CLIENT_ID to your bot application id.');
      process.exit(1);
    }
    if (!topggToken) {
      baseLogger.error('TOPGG_TOKEN not set in environment. Set TOPGG_TOKEN to your top.gg project token.');
      process.exit(1);
    }

    baseLogger.info('Loading commands...');
    const commands = await loadCommands();
    if (!commands || !commands.length) {
      baseLogger.warn('No commands found to send to top.gg');
      process.exit(0);
    }

    baseLogger.info(`Sending ${commands.length} commands to top.gg for project ${clientId}`);
    const res = await putToTopgg(clientId, topggToken, commands);
    baseLogger.info('top.gg update successful', res && res.status);
    process.exit(0);
  } catch (e) {
    baseLogger.error('Failed to update top.gg commands', e && (e.stack || e));
    process.exit(1);
  }
})();
