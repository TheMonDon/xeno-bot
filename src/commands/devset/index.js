const fs = require('fs');
const path = require('path');

function setDeep(obj, pathParts, value) {
  let cur = obj;
  for (let i = 0; i < pathParts.length - 1; i++) {
    const p = pathParts[i];
    if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {};
    cur = cur[p];
  }
  cur[pathParts[pathParts.length - 1]] = value;
}

module.exports = {
  name: 'devset',
  description: 'Developer-only: set value in config file — text mode removed; use /devmenu',
  developerOnly: true
};
