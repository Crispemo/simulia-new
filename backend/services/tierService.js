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

module.exports = {
  EXPLORAR_ALLOWED_EXAM_TYPE,
  ENTRADA_MONTHLY_LIMIT,
  ENTRADA_PERIOD_DAYS,
  resolveTierFromPriceId,
  computeEffectiveTier,
};
