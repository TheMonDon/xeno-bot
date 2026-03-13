module.exports = {
  name: 'trade',
  description: 'Trade eggs or xenomorphs with another player (stub).',
  data: { name: 'trade', description: 'Trade eggs or xenomorphs with another player' },
  async executeInteraction(interaction) {
    try {
      await interaction.reply({ content: 'Trading is not available in this build.', ephemeral: true });
    } catch (e) {
      try { await interaction.followUp({ content: 'Trading is not available.', ephemeral: true }); } catch (_) { /* ignore */ }
    }
  }
};
