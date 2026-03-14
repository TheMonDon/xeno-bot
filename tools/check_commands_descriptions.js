const path = require('path');
const loader = require('../src/commands/loader');
const cmds = loader.loadCommands(path.join(__dirname, '..', 'src', 'commands'));
const out = [];
for (const [name, cmd] of cmds) {
  const data = cmd.data;
  const d = (data && (typeof data.toJSON === 'function' ? data.toJSON() : data));
  out.push({ name, hasName: !!(d && d.name), nameVal: d && d.name, hasDescription: !!(d && d.description), description: d && d.description });
}
console.log(JSON.stringify(out, null, 2));
