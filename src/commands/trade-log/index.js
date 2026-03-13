module.exports = {
  name: 'trade-log',
  description: 'View your past trades and transactions (stub).',
  data: { name: 'trade-log', description: 'View your past trades and transactions' },
  async executeInteraction(interaction) {
    try {
      await interaction.reply({ content: 'Trade logs are unavailable in this build.', ephemeral: true });
    } catch (e) {
      try { await interaction.followUp({ content: 'Trade logs are unavailable.', ephemeral: true }); } catch (_) { /* ignore */ }
    }
  }
};
