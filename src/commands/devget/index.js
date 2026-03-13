module.exports = {
  name: 'devget',
  description: 'Get runtime config or environment value (disabled stub).',
  data: { name: 'devget', description: 'Get runtime config or environment value' },
  async executeInteraction(interaction) {
    try {
      await interaction.reply({ content: 'devget is disabled in this build.', ephemeral: true });
    } catch (e) {
      try { await interaction.followUp({ content: 'devget is disabled.', ephemeral: true }); } catch (_) { /* ignore */ }
    }
  }
};
