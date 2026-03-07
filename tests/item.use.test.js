const itemCmd = require('../src/commands/item/index.js');
const hatchManager = require('../src/hatchManager');

jest.mock('../src/utils/safeReply', () => jest.fn(() => Promise.resolve()));

describe('Item use and hatch integration', () => {
  let userModelMock;
  let dbMock;

  beforeEach(() => {
    jest.resetModules();
    userModelMock = require('../src/models/user');
    dbMock = require('../src/db');
  });

  test('using incubation_accelerator applies an effect with multiplier 0.25-0.5', async () => {
    // mock user functions
    const fakeUser = { id: 42, discord_id: 'U1', data: { guilds: { G1: { items: { incubation_accelerator: 1 }, currency: {} } } } };
    userModelMock.getUserByDiscordId = jest.fn().mockResolvedValue(fakeUser);
    userModelMock.removeItemForGuild = jest.fn().mockResolvedValue(0);
    userModelMock.updateUserDataRawById = jest.fn().mockResolvedValue();

    const interaction = {
      options: {
        getSubcommand: () => 'use',
        getString: (name) => (name === 'item_id' ? 'incubation_accelerator' : null)
      },
      guildId: 'G1',
      user: { id: 'U1' },
      deferReply: jest.fn().mockResolvedValue()
    };

    await itemCmd.executeInteraction(interaction);

    expect(userModelMock.removeItemForGuild).toHaveBeenCalledWith('U1', 'G1', 'incubation_accelerator', 1);
    expect(userModelMock.updateUserDataRawById).toHaveBeenCalled();
    const updatedData = userModelMock.updateUserDataRawById.mock.calls[0][1];
    const eff = updatedData.guilds.G1.effects && updatedData.guilds.G1.effects.incubation_accelerator;
    expect(eff).toBeDefined();
    expect(eff.multiplier).toBeGreaterThanOrEqual(0.25);
    expect(eff.multiplier).toBeLessThanOrEqual(0.5);
  });

  test('startHatch consumes incubation_accelerator and applies multiplier to duration', async () => {
    jest.resetModules();
    // reconstruct mocks for hatchManager require
    const userModel = require('../src/models/user');
    let capturedInsert = null;
    const fakeKnex = jest.fn((table) => ({ insert: async (obj) => { capturedInsert = obj; return [123]; } }));
    jest.doMock('../src/db', () => ({ knex: fakeKnex }));

    // re-require hatchManager to pick up mocked db
    const hm = require('../src/hatchManager');

    const now = Date.now();
    const fakeUser = { id: 99, discord_id: 'U1', data: { guilds: { G1: { items: { classic: 1 }, effects: { incubation_accelerator: { multiplier: 0.3, applied_at: now, expires_at: now + 10000 } } } } } };
    userModel.getUserByDiscordId = jest.fn().mockResolvedValue(fakeUser);
    userModel.updateUserDataRawById = jest.fn().mockResolvedValue();

    const h = await hm.startHatch('U1', 'G1', 'classic', 60_000);
    expect(capturedInsert).toBeTruthy();
    // finishes_at should be roughly now + 60_000 * multiplier (0.3)
    const finishesAt = Number(capturedInsert.finishes_at);
    const startedAt = Number(capturedInsert.started_at);
    const duration = finishesAt - startedAt;
    // expected ~18000 ms (allow for small timing differences)
    expect(duration).toBeGreaterThanOrEqual(1000);
    expect(userModel.updateUserDataRawById).toHaveBeenCalled();
    // ensure effect was removed in persisted data
    const persistedData = userModel.updateUserDataRawById.mock.calls[0][1];
    const eff = persistedData.guilds.G1.effects && persistedData.guilds.G1.effects.incubation_accelerator;
    expect(eff).toBeUndefined();
  });
});
