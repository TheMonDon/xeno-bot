const { getCommandConfig } = require('../../utils/commandsConfig');
const safeReply = require('../../utils/safeReply');
const userModel = require('../../models/user');

const cmd = getCommandConfig('coinflip') || { name: 'coinflip', description: 'Flip a coin to try double your Royal Jelly (RJ).' };

module.exports = {
  name: cmd.name,
  description: cmd.description,
  data: {
    name: cmd.name,
    description: cmd.description,
    options: [
      { name: 'amount', description: 'Amount of royal_jelly to bet', type: 4, required: true, min_value: 1 },
      { name: 'choice', description: 'Your choice: heads or tails', type: 3, required: true, choices: [ { name: 'heads', value: 'heads' }, { name: 'tails', value: 'tails' } ] }
    ]
  },

  async executeInteraction(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    if (!guildId) return safeReply(interaction, { content: 'This command must be used in a server.' });

    const amount = Number(interaction.options && interaction.options.getInteger ? interaction.options.getInteger('amount') || 0 : 0);
    const choice = interaction.options && interaction.options.getString ? (interaction.options.getString('choice') || '').toLowerCase() : '';
    if (!amount || amount <= 0) return safeReply(interaction, { content: 'Invalid bet amount.' });
    if (!['heads','tails'].includes(choice)) return safeReply(interaction, { content: 'Invalid choice; pick heads or tails.' });

    const bal = await userModel.getCurrencyForGuild(userId, guildId, 'royal_jelly');
    if (bal < amount) return safeReply(interaction, { content: `Insufficient Royal Jelly. You have ${bal}.` });

    // Deduct bet
    await userModel.modifyCurrencyForGuild(userId, guildId, 'royal_jelly', -amount);

    const flip = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = flip === choice;
    let payout = 0;
    if (won) {
      payout = amount * 2; // credit back bet + winnings (net +amount)
      await userModel.modifyCurrencyForGuild(userId, guildId, 'royal_jelly', +payout);
    }

    const newBal = await userModel.getCurrencyForGuild(userId, guildId, 'royal_jelly');
    const resultMsg = won ? `You won! The coin landed **${flip}**. You receive ${payout} RJ.` : `You lost. The coin landed **${flip}**.`;
    return safeReply(interaction, { content: `${resultMsg} New balance: ${newBal} RJ.` });
  }
};
