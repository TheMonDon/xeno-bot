module.exports = {
  name: 'collect',
  description: 'Collect a spawned egg from the channel (stub).',
  data: { name: 'collect', description: 'Collect a spawned egg from the channel' },
  async executeInteraction(interaction) {
    try {
      await interaction.reply({ content: 'Collect command is not available in this build.', ephemeral: true });
    } catch (e) {
      try { await interaction.followUp({ content: 'Collect command is unavailable.', ephemeral: true }); } catch (_) { /* ignore */ }
    }
  }
};
