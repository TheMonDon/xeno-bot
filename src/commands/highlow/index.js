const { getCommandConfig } = require('../../utils/commandsConfig');
const safeReply = require('../../utils/safeReply');
const userModel = require('../../models/user');

const cmd = getCommandConfig('highlow') || { name: 'highlow', description: 'Bet RJ on whether a roll (1-100) will be high (>50) or low (<=50).' };

module.exports = {
  name: cmd.name,
  description: cmd.description,
  data: {
    name: cmd.name,
    description: cmd.description,
    options: [
      { name: 'amount', description: 'Amount of royal_jelly to bet', type: 4, required: true, min_value: 1 },
      { name: 'guess', description: 'Guess high or low', type: 3, required: true, choices: [ { name: 'high', value: 'high' }, { name: 'low', value: 'low' } ] }
    ]
  },

  async executeInteraction(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    if (!guildId) return safeReply(interaction, { content: 'This command must be used in a server.' });

    const amount = Number(interaction.options && interaction.options.getInteger ? interaction.options.getInteger('amount') || 0 : 0);
    const guess = interaction.options && interaction.options.getString ? (interaction.options.getString('guess') || '').toLowerCase() : '';
    if (!amount || amount <= 0) return safeReply(interaction, { content: 'Invalid bet amount.' });
    if (!['high','low'].includes(guess)) return safeReply(interaction, { content: 'Invalid guess; pick high or low.' });

    const bal = await userModel.getCurrencyForGuild(userId, guildId, 'royal_jelly');
    if (bal < amount) return safeReply(interaction, { content: `Insufficient Royal Jelly. You have ${bal}.` });

    // Deduct bet
    await userModel.modifyCurrencyForGuild(userId, guildId, 'royal_jelly', -amount);

    const roll = Math.floor(Math.random() * 100) + 1; // 1-100
    const isHigh = roll > 50;
    const won = (isHigh && guess === 'high') || (!isHigh && guess === 'low');
    let payout = 0;
    if (won) {
      // reward: slight advantage for risk: payout 1.9x (rounded)
      payout = Math.floor(amount * 1.9);
      await userModel.modifyCurrencyForGuild(userId, guildId, 'royal_jelly', +payout);
    }

    const newBal = await userModel.getCurrencyForGuild(userId, guildId, 'royal_jelly');
    const resultMsg = won ? `You won! Roll: **${roll}**. You receive ${payout} RJ.` : `You lost. Roll: **${roll}**.`;
    return safeReply(interaction, { content: `${resultMsg} New balance: ${newBal} RJ.` });
  }
};
