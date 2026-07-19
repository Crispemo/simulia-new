const EXPLORAR_ALLOWED_EXAM_TYPE = 'simulacro';
const ENTRADA_MONTHLY_LIMIT = 4;
const ENTRADA_PERIOD_DAYS = 30;

function resolveTierFromPriceId(priceId, priceTierMap) {
  if (!priceId || !priceTierMap) return null;
  return priceTierMap[priceId] || null;
}

function computeEffectiveTier(user) {
  if (user.tier === 'explorar' || user.tier === 'plaza') return user.tier;
  const activePlans = new Set(['mensual', 'anual']);
  if (user.plan && activePlans.has(user.plan)) return 'plaza';
  return null;
}

function getCurrentPeriodUsage(user, now = new Date()) {
  const stored = user.entradaUsage || {};
  const periodMs = ENTRADA_PERIOD_DAYS * 24 * 60 * 60 * 1000;
  const isExpired = !stored.periodStart || (now.getTime() - new Date(stored.periodStart).getTime()) >= periodMs;
  if (isExpired) {
    return { periodStart: now, simulacrosUsed: 0 };
  }
  return { periodStart: new Date(stored.periodStart), simulacrosUsed: stored.simulacrosUsed || 0 };
}

function checkEntradaAllowance(user, examType, now = new Date()) {
  const tier = computeEffectiveTier(user);
  if (tier !== 'explorar') return { allowed: true };

  if (examType !== EXPLORAR_ALLOWED_EXAM_TYPE) {
    return { allowed: false, reason: 'Este modo requiere el plan Voy a por la plaza' };
  }

  const usage = getCurrentPeriodUsage(user, now);
  if (usage.simulacrosUsed >= ENTRADA_MONTHLY_LIMIT) {
    return { allowed: false, reason: `Has usado tus ${ENTRADA_MONTHLY_LIMIT} simulacros de este mes` };
  }

  return { allowed: true };
}

function consumeEntradaSimulacro(user, now = new Date()) {
  const usage = getCurrentPeriodUsage(user, now);
  return { periodStart: usage.periodStart, simulacrosUsed: usage.simulacrosUsed + 1 };
}

module.exports = {
  EXPLORAR_ALLOWED_EXAM_TYPE,
  ENTRADA_MONTHLY_LIMIT,
  ENTRADA_PERIOD_DAYS,
  resolveTierFromPriceId,
  computeEffectiveTier,
  getCurrentPeriodUsage,
  checkEntradaAllowance,
  consumeEntradaSimulacro,
};
