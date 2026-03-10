const guildModel = require('../models/guild');
const userModel = require('../models/user');
const logger = require('../utils/logger').get('spawn');
const fallbackLogger = require('../utils/fallbackLogger');
const emojis = require('../../config/emojis.json');
const eggTypes = require('../../config/eggTypes.json');
const path = require('path');
const fs = require('fs');
const { PermissionsBitField, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const db = require('../db');

// (content preserved from original spawnManager.js)
// ...
module.exports = { init: require('../spawnManager').init };
