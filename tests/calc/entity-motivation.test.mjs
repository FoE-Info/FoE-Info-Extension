import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  isEntityMotivatable,
  isEntityAided,
} = require('../../src/js/calc/entities/entityMotivation.js');

test('entityMotivation suite', async (t) => {
  await t.test('isEntityMotivatable identifies motivatable buildings', () => {
    // Great Buildings cannot be motivated
    assert.equal(
      isEntityMotivatable(
        { cityentity_id: 'X_ProgressiveEra_Landmark1', type: 'greatbuilding' },
        { type: 'greatbuilding' },
      ),
      false,
    );
    assert.equal(
      isEntityMotivatable(
        { cityentity_id: 'X_IronAge_Landmark' },
        { type: 'residential' },
      ),
      false,
    );
    assert.equal(isEntityMotivatable(null, null), false);
    assert.equal(isEntityMotivatable({}, null), false);

    // GenericCityEntity with socialInteraction component
    assert.equal(
      isEntityMotivatable(
        { cityentity_id: 'R_MultiAge_Event1' },
        {
          __class__: 'GenericCityEntity',
          components: { AllAge: { socialInteraction: {} } },
        },
      ),
      true,
    );

    // MotivatableAbility
    assert.equal(
      isEntityMotivatable(
        { cityentity_id: 'b1' },
        {
          abilities: [{ __class__: 'MotivatableAbility' }],
        },
      ),
      true,
    );

    // PolishableAbility
    assert.equal(
      isEntityMotivatable(
        { cityentity_id: 'd1' },
        {
          abilities: [{ __class__: 'PolishableAbility' }],
        },
      ),
      true,
    );

    // RandomUnitOfAgeWhenMotivatedAbility
    assert.equal(
      isEntityMotivatable(
        { cityentity_id: 'u1' },
        {
          abilities: [{ __class__: 'RandomUnitOfAgeWhenMotivatedAbility' }],
        },
      ),
      true,
    );

    // Abilities with no motivatable markers
    assert.equal(
      isEntityMotivatable(
        { cityentity_id: 't1' },
        {
          abilities: [{ __class__: 'AddResourcesAbility' }],
        },
      ),
      false,
    );
  });

  await t.test('isEntityAided detects motivation and polishing states', () => {
    // No state defaults to true
    assert.equal(isEntityAided(null, null), true);
    assert.equal(isEntityAided({}, null), true);

    // Boosted or is_motivated
    assert.equal(isEntityAided({ state: { is_motivated: true } }, {}), true);
    assert.equal(isEntityAided({ state: { boosted: true } }, {}), true);

    // Active social interaction
    assert.equal(
      isEntityAided(
        {
          state: {
            socialInteractionStartedAt: 1000,
            socialInteractionId: 'motivate',
          },
        },
        {},
      ),
      true,
    );

    // Polish within 12h
    const nowSec = Math.floor(Date.now() / 1000);
    assert.equal(
      isEntityAided(
        {
          state: {
            socialInteractionStartedAt: nowSec - 3600,
            socialInteractionId: 'polish',
          },
        },
        {},
      ),
      true,
    );

    // Polish expired (> 12h)
    assert.equal(
      isEntityAided(
        {
          state: {
            socialInteractionStartedAt: nowSec - 50000,
            socialInteractionId: 'polish',
          },
        },
        {},
      ),
      false,
    );

    // Next state transition with PolishableAbility
    assert.equal(
      isEntityAided(
        { state: { next_state_transition_in: 3600 } },
        { abilities: [{ __class__: 'PolishableAbility' }] },
      ),
      true,
    );

    // Inactive states
    assert.equal(isEntityAided({ state: { is_motivated: false } }, {}), false);
    assert.equal(isEntityAided({ state: {} }, {}), false);
  });
});
