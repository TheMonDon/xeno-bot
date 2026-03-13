module.exports = {
  name: 'devreload',
  description: 'Reload command modules and configs (stub).',
  data: { name: 'devreload', description: 'Reload command modules and configs' },
  async executeInteraction(interaction) {
    try {
      await interaction.reply({ content: 'devreload is disabled in this build.', ephemeral: true });
    } catch (e) {
      try { await interaction.followUp({ content: 'devreload is disabled.', ephemeral: true }); } catch (_) { /* ignore */ }
    }
  }
};
