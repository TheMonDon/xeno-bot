const commands = ['hunt', 'hunt-list', 'ping', 'hive', 'evolve', 'emojis', 'pathway', 'help'];
let success = 0;
let failed = 0;

for (const cmd of commands) {
  try {
    require(`./src/commands/${cmd}`);
    console.log(`✓ ${cmd}`);
    success++;
  } catch(e) {
    console.error(`✗ ${cmd}: ${e.message}`);
    failed++;
  }
}

console.log(`\nResult: ${success}/${commands.length} loaded successfully`);
if (failed > 0) {
  console.error(`${failed} command(s) failed to load`);
  process.exit(1);
}
