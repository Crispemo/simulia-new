const test = require('node:test');
const assert = require('node:assert/strict');
const {
  computeEffectiveTier,
  resolveTierFromPriceId,
} = require('./tierService');

test('computeEffectiveTier: returns explicit tier when set', () => {
  assert.equal(computeEffectiveTier({ tier: 'explorar', plan: 'mensual' }), 'explorar');
  assert.equal(computeEffectiveTier({ tier: 'plaza', plan: null }), 'plaza');
});

test('computeEffectiveTier: falls back to plaza for legacy subscribers with active plan and no tier', () => {
  assert.equal(computeEffectiveTier({ tier: null, plan: 'mensual' }), 'plaza');
  assert.equal(computeEffectiveTier({ tier: null, plan: 'anual' }), 'plaza');
});

test('computeEffectiveTier: returns null when no plan and no tier', () => {
  assert.equal(computeEffectiveTier({ tier: null, plan: null }), null);
});

test('resolveTierFromPriceId: looks up price id in the given map', () => {
  const map = { price_explorar_123: 'explorar', price_plaza_456: 'plaza' };
  assert.equal(resolveTierFromPriceId('price_explorar_123', map), 'explorar');
  assert.equal(resolveTierFromPriceId('price_plaza_456', map), 'plaza');
});

test('resolveTierFromPriceId: returns null for unknown or missing price id', () => {
  const map = { price_explorar_123: 'explorar' };
  assert.equal(resolveTierFromPriceId('price_unknown', map), null);
  assert.equal(resolveTierFromPriceId(null, map), null);
});
