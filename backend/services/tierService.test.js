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

const {
  getCurrentPeriodUsage,
  checkEntradaAllowance,
  consumeEntradaSimulacro,
} = require('./tierService');

test('getCurrentPeriodUsage: starts a fresh period when there is no stored usage', () => {
  const now = new Date('2026-07-19T00:00:00Z');
  const usage = getCurrentPeriodUsage({ entradaUsage: undefined }, now);
  assert.deepEqual(usage, { periodStart: now, simulacrosUsed: 0 });
});

test('getCurrentPeriodUsage: keeps the counter within a 30-day window', () => {
  const periodStart = new Date('2026-07-01T00:00:00Z');
  const now = new Date('2026-07-19T00:00:00Z');
  const usage = getCurrentPeriodUsage({ entradaUsage: { periodStart, simulacrosUsed: 2 } }, now);
  assert.equal(usage.simulacrosUsed, 2);
  assert.equal(usage.periodStart.getTime(), periodStart.getTime());
});

test('getCurrentPeriodUsage: resets the counter after 30 days', () => {
  const periodStart = new Date('2026-06-01T00:00:00Z');
  const now = new Date('2026-07-19T00:00:00Z');
  const usage = getCurrentPeriodUsage({ entradaUsage: { periodStart, simulacrosUsed: 3 } }, now);
  assert.equal(usage.simulacrosUsed, 0);
  assert.equal(usage.periodStart.getTime(), now.getTime());
});

test('checkEntradaAllowance: plaza tier is always allowed regardless of type or usage', () => {
  const user = { tier: 'plaza', plan: 'mensual', entradaUsage: { simulacrosUsed: 99 } };
  assert.deepEqual(checkEntradaAllowance(user, 'quizz'), { allowed: true });
});

test('checkEntradaAllowance: explorar tier is blocked from non-simulacro types', () => {
  const user = { tier: 'explorar', entradaUsage: { simulacrosUsed: 0 } };
  const result = checkEntradaAllowance(user, 'protocolos');
  assert.equal(result.allowed, false);
  assert.match(result.reason, /Voy a por la plaza/);
});

test('checkEntradaAllowance: explorar tier is allowed simulacro under the monthly limit', () => {
  const user = { tier: 'explorar', entradaUsage: { periodStart: new Date(), simulacrosUsed: 3 } };
  assert.deepEqual(checkEntradaAllowance(user, 'simulacro'), { allowed: true });
});

test('checkEntradaAllowance: explorar tier is blocked once the monthly limit is reached', () => {
  const user = { tier: 'explorar', entradaUsage: { periodStart: new Date(), simulacrosUsed: 4 } };
  const result = checkEntradaAllowance(user, 'simulacro');
  assert.equal(result.allowed, false);
  assert.match(result.reason, /4 simulacros/);
});

test('consumeEntradaSimulacro: increments the counter within the current period', () => {
  const periodStart = new Date('2026-07-01T00:00:00Z');
  const now = new Date('2026-07-19T00:00:00Z');
  const user = { entradaUsage: { periodStart, simulacrosUsed: 1 } };
  const updated = consumeEntradaSimulacro(user, now);
  assert.equal(updated.simulacrosUsed, 2);
  assert.equal(updated.periodStart.getTime(), periodStart.getTime());
});
