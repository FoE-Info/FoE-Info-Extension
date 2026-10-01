import assert from 'node:assert/strict';
import test from 'node:test';
import calculator from '../../src/js/calc/TreasuryContributionsCalculator.js';

test('treasury breakdown separates donations, returns, and arena costs with precise net changes', () => {
  const entry = (action, amount, resource = 'goods') => ({
    playerName: 'Player',
    action,
    amount,
    resource,
  });
  const result = calculator.calculateTreasuryContributions(
    [
      entry('Building production', '9007199254740993'),
      entry('Guild treasury donation', 20),
      entry('Battlegrounds: Place Building', 3),
      entry('Guild expedition: difficulty unlocked', 4),
      entry('Siege army deployment', 5),
      entry('Guild continent: grant freedom', 2),
      entry('Donation', 30, 'medals'),
      entry('Siege army deployment', 10, 'medals'),
      entry('Guild continent: grant freedom', 4, 'medals'),
    ],
    new Map([['goods', 100]]),
    [{ id: 'goods', name: 'Streamed goods', era: 'StreamedEra' }],
    [{ name: 'Quiet member' }],
  );
  const member = result.members.get('Player');
  assert.equal(member.goodsBuilding.toFixed(), '9007199254740993');
  assert.equal(member.goodsManual.toFixed(), '20');
  assert.equal(member.goodsSpentGbg.toFixed(), '3');
  assert.equal(member.goodsSpentGe.toFixed(), '4');
  assert.equal(member.goodsSpentGvg.toFixed(), '5');
  assert.equal(member.goodsReturnedGvg.toFixed(), '2');
  assert.equal(member.eras.get('StreamedEra').toFixed(), '20');
  assert.equal(
    member.medalsDonated
      .plus(member.medalsReturned)
      .minus(member.medalsSpent)
      .toFixed(),
    '24',
  );
  assert.equal(result.resources.get('goods').net.toFixed(), '9007199254741003');
  assert.equal(result.resources.get('goods').gvg.toFixed(), '3');
  assert.equal(result.resources.get('goods').balance.toFixed(), '100');
  assert.equal(result.members.get('Quiet member').goodsManual.toFixed(), '0');
});
