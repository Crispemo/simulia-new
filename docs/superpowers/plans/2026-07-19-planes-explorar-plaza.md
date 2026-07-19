# Planes Explorar y Voy a por la plaza — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `tier` dimension (`explorar` / `plaza`) on top of the existing binary subscription gate, enforce it server-side on the exam-saving flow, and reflect it in the sidebar UI as grayed-out, non-clickable locked items.

**Architecture:** A new pure module `backend/services/tierService.js` holds all tier-resolution and quota logic (no Express/Mongoose coupling, testable with Node's built-in test runner). `backend/server.js` wires it into the three places that already touch subscription state: `/validate-and-save-exam` (enforcement + quota increment), `/users/check-subscription` (status reporting), and the two Stripe purchase-confirmation code paths (tier assignment on payment). The frontend reads the extended `/users/check-subscription` response in `Dashboard.js` (extending the existing `resourcesLocked`/`communityLocked` pattern) and passes lock state down into `Sidebar` (`frontend/src/components/sidebar.jsx`), which already has a proven locked-item pattern (`disabled` + `opacity-50 cursor-not-allowed` + `Lock` icon) for Resources/Community.

**Tech Stack:** Node.js/Express/Mongoose backend, React frontend, Node's built-in `node:test` + `node:assert` for backend unit tests (no new dependency — Node 22 is installed).

**Scope notes (read before starting):**
- `frontend/src/components/exam-mode-selector.jsx` is dead code (not imported anywhere) — do not touch it. The real exam-mode navigation is `menuItems` in `sidebar.jsx`.
- The AI chatbot (`ai-assistant.jsx`) and progress components (`TimelineProgress.js`, `TopFailedSubjects`) are currently unmounted/commented out in `Dashboard.js` — not reachable by any user today. No gating is added for them in this plan; when they're actually shipped, follow the same pattern as Task 9.
- WhatsApp contact is a manual/marketing bullet point (`Precios.js`, `HomePage.js`), not an in-app feature — nothing to gate in code.
- Question-fetching endpoints (`/random-question-completos`, `/random-questions`, `/protocol-questions`) have no user authentication today (pre-existing gap, not introduced by this feature). This plan does not add auth to them — the authoritative enforcement point is the exam-finalize endpoint (`/validate-and-save-exam`), which already has `verifyUser` + `verifySubscription`. This is documented as a known limitation, not silently ignored.
- No existing subscribers today, per user confirmation — but the fallback rule (Task 1) protects any that do exist so their access never changes.

---

### Task 1: Add `tier` and `entradaUsage` fields to the User model

**Files:**
- Modify: `backend/models/User.js:51` (right after the existing `plan` field)

- [ ] **Step 1: Add the fields**

In `backend/models/User.js`, the `userSchema` currently has (line 51):

```js
  plan: { type: String, enum: ['mensual', 'anual'], required: false, default: null },
```

Add immediately after it:

```js
  plan: { type: String, enum: ['mensual', 'anual'], required: false, default: null },
  tier: { type: String, enum: ['explorar', 'plaza'], required: false, default: null },
  entradaUsage: {
    periodStart: { type: Date },
    simulacrosUsed: { type: Number, default: 0 }
  },
```

- [ ] **Step 2: Verify the app still boots**

Run: `cd backend && node -e "require('./models/User'); console.log('OK')"`
Expected: `OK` printed, no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/models/User.js
git commit -m "Añade campos tier y entradaUsage al modelo de usuario"
```

---

### Task 2: Create `tierService.js` — tier resolution

**Files:**
- Create: `backend/services/tierService.js`
- Test: `backend/services/tierService.test.js`

- [ ] **Step 1: Write the failing test for `computeEffectiveTier` and `resolveTierFromPriceId`**

Create `backend/services/tierService.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && node --test services/tierService.test.js`
Expected: FAIL — `Cannot find module './tierService'`

- [ ] **Step 3: Implement `tierService.js`**

Create `backend/services/tierService.js`:

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && node --test services/tierService.test.js`
Expected: PASS, 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add backend/services/tierService.js backend/services/tierService.test.js
git commit -m "Añade resolución de tier (explorar/plaza) en tierService"
```

---

### Task 3: `tierService.js` — cupo de simulacros para Explorar

**Files:**
- Modify: `backend/services/tierService.js`
- Modify: `backend/services/tierService.test.js`

- [ ] **Step 1: Write the failing tests**

Append to `backend/services/tierService.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && node --test services/tierService.test.js`
Expected: FAIL — the new functions are not exported yet.

- [ ] **Step 3: Implement the quota functions**

In `backend/services/tierService.js`, add after `computeEffectiveTier`:

```js
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
```

Update the `module.exports` block to include the new functions:

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && node --test services/tierService.test.js`
Expected: PASS, 13 tests passing total.

- [ ] **Step 5: Commit**

```bash
git add backend/services/tierService.js backend/services/tierService.test.js
git commit -m "Añade lógica de cupo mensual de simulacros para el plan Explorar"
```

---

### Task 4: Enforce the tier check in `/validate-and-save-exam`

**Files:**
- Modify: `backend/server.js`

- [ ] **Step 1: Import tierService near the top of server.js**

In `backend/server.js`, find (near line 19):

```js
const User = require('./models/User');
```

Add right after it:

```js
const User = require('./models/User');
const {
  EXPLORAR_ALLOWED_EXAM_TYPE,
  computeEffectiveTier,
  checkEntradaAllowance,
  consumeEntradaSimulacro,
} = require('./services/tierService');
```

- [ ] **Step 2: Block disallowed/over-limit saves**

In `backend/server.js`, find inside `/validate-and-save-exam` (around line 2086):

```js
  if (!examType) {
    console.error('Falta el tipo de examen');
    return res.status(400).json({ error: 'Falta el tipo de examen' });
  }
```

Add immediately after it:

```js
  if (!examType) {
    console.error('Falta el tipo de examen');
    return res.status(400).json({ error: 'Falta el tipo de examen' });
  }

  const entradaCheck = checkEntradaAllowance(req.user, examType);
  if (!entradaCheck.allowed) {
    console.log(`Usuario ${req.user.userId} bloqueado por tier al guardar examen tipo ${examType}: ${entradaCheck.reason}`);
    return res.status(403).json({ error: entradaCheck.reason });
  }
```

- [ ] **Step 3: Increment the quota after a successful save**

In `backend/server.js`, find inside the same route (around line 2378):

```js
    } else {
      // No hay ID de examen previo, crear uno nuevo
      examenResultado = new ExamenResultado(examData);
      await examenResultado.save();
      console.log(`Nuevo examen creado con ID: ${examenResultado._id}`);
    }
    
    console.log('Examen guardado en ExamenResultado con ID:', examenResultado._id);
```

Add right after that log line:

```js
    console.log('Examen guardado en ExamenResultado con ID:', examenResultado._id);

    if (computeEffectiveTier(user) === 'explorar' && examType === EXPLORAR_ALLOWED_EXAM_TYPE) {
      user.entradaUsage = consumeEntradaSimulacro(user);
      await user.save();
      console.log(`Cupo Explorar actualizado para ${user.userId}: ${user.entradaUsage.simulacrosUsed}/4 simulacros usados`);
    }
```

(`user` is already in scope in this route — declared at the top as `const user = req.user;`.)

- [ ] **Step 4: Manual verification**

Start the backend (`cd backend && npm run dev`) and, with a test user that has `tier: 'explorar'` set directly in MongoDB, POST to `/validate-and-save-exam` with `examType: 'quizz'`. Confirm the response is `403` with the message `Este modo requiere el plan Voy a por la plaza`. Then POST with `examType: 'simulacro'` four times in a row (completing each) and confirm the 5th attempt returns `403` with `Has usado tus 4 simulacros de este mes`, and that `user.entradaUsage.simulacrosUsed` in MongoDB reads `4`.

- [ ] **Step 5: Commit**

```bash
git add backend/server.js
git commit -m "Aplica el gate de tier y el cupo de simulacros en /validate-and-save-exam"
```

---

### Task 5: Report tier status from `/users/check-subscription`

**Files:**
- Modify: `backend/server.js`

This route (`app.post('/users/check-subscription', ...)`, starting line 592) has four `res.json(...)` return points. Each needs `tier`, `simulacrosUsed`, and `simulacrosLimit` added so the frontend can read them consistently regardless of which branch executes.

- [ ] **Step 1: No-stripeId branch**

Find (around line 634):

```js
      return res.json({
        hasSubscription: false,
        subscriptionActive: false,
        plan: user.plan || null,
        expirationDate: user.expirationDate || null,
        isExpired: true,
        source: 'stripe',
        resourcesAccessAllowed: false,
        communityAccessAllowed: false,
        user: { userId: user.userId, email: user.email, userName: user.userName },
      });
```

Replace with:

```js
      return res.json({
        hasSubscription: false,
        subscriptionActive: false,
        plan: user.plan || null,
        expirationDate: user.expirationDate || null,
        isExpired: true,
        source: 'stripe',
        resourcesAccessAllowed: false,
        communityAccessAllowed: false,
        tier: computeEffectiveTier(user),
        simulacrosUsed: getCurrentPeriodUsage(user).simulacrosUsed,
        simulacrosLimit: ENTRADA_MONTHLY_LIMIT,
        user: { userId: user.userId, email: user.email, userName: user.userName },
      });
```

- [ ] **Step 2: Active-subscription branch**

Find (around line 692):

```js
        return res.json({
          hasSubscription: true,
          subscriptionActive: true,
          plan: user.plan,
          expirationDate: user.expirationDate || null,
          isExpired: false,
          source: 'stripe',
          resourcesAccessAllowed: accessAllowedForPremiumSections,
          communityAccessAllowed: accessAllowedForPremiumSections,
          user: { userId: user.userId, email: user.email, userName: user.userName },
        });
```

Replace with:

```js
        return res.json({
          hasSubscription: true,
          subscriptionActive: true,
          plan: user.plan,
          expirationDate: user.expirationDate || null,
          isExpired: false,
          source: 'stripe',
          resourcesAccessAllowed: accessAllowedForPremiumSections,
          communityAccessAllowed: accessAllowedForPremiumSections,
          tier: computeEffectiveTier(user),
          simulacrosUsed: getCurrentPeriodUsage(user).simulacrosUsed,
          simulacrosLimit: ENTRADA_MONTHLY_LIMIT,
          user: { userId: user.userId, email: user.email, userName: user.userName },
        });
```

- [ ] **Step 3: No-active-subscription branch**

Find (around line 716):

```js
      return res.json({
        hasSubscription: false,
        subscriptionActive: false,
        plan: user.plan,
        expirationDate: user.expirationDate || null,
        isExpired,
        source: 'stripe',
        resourcesAccessAllowed: false,
        communityAccessAllowed: false,
        user: { userId: user.userId, email: user.email, userName: user.userName },
      });
```

Replace with:

```js
      return res.json({
        hasSubscription: false,
        subscriptionActive: false,
        plan: user.plan,
        expirationDate: user.expirationDate || null,
        isExpired,
        source: 'stripe',
        resourcesAccessAllowed: false,
        communityAccessAllowed: false,
        tier: computeEffectiveTier(user),
        simulacrosUsed: getCurrentPeriodUsage(user).simulacrosUsed,
        simulacrosLimit: ENTRADA_MONTHLY_LIMIT,
        user: { userId: user.userId, email: user.email, userName: user.userName },
      });
```

- [ ] **Step 4: Stripe-error branch**

Find (around line 730):

```js
      return res.json({
        hasSubscription: false,
        subscriptionActive: false,
        plan: user.plan,
        expirationDate: user.expirationDate || null,
        isExpired: true,
        source: 'stripe',
        subscriptionUnverifiable: true,
        resourcesAccessAllowed: false,
        communityAccessAllowed: false,
        user: { userId: user.userId, email: user.email, userName: user.userName },
      });
```

Replace with:

```js
      return res.json({
        hasSubscription: false,
        subscriptionActive: false,
        plan: user.plan,
        expirationDate: user.expirationDate || null,
        isExpired: true,
        source: 'stripe',
        subscriptionUnverifiable: true,
        resourcesAccessAllowed: false,
        communityAccessAllowed: false,
        tier: computeEffectiveTier(user),
        simulacrosUsed: getCurrentPeriodUsage(user).simulacrosUsed,
        simulacrosLimit: ENTRADA_MONTHLY_LIMIT,
        user: { userId: user.userId, email: user.email, userName: user.userName },
      });
```

- [ ] **Step 5: Update the import to include the remaining helpers**

In `backend/server.js`, update the import added in Task 4, Step 1 to also bring in `getCurrentPeriodUsage` and `ENTRADA_MONTHLY_LIMIT`:

```js
const {
  EXPLORAR_ALLOWED_EXAM_TYPE,
  ENTRADA_MONTHLY_LIMIT,
  computeEffectiveTier,
  checkEntradaAllowance,
  getCurrentPeriodUsage,
  consumeEntradaSimulacro,
} = require('./services/tierService');
```

- [ ] **Step 6: Manual verification**

`curl -X POST http://localhost:5001/users/check-subscription -H "Content-Type: application/json" -d '{"userId":"<test-user-id>"}'` and confirm the JSON response includes `tier`, `simulacrosUsed`, and `simulacrosLimit: 4`.

- [ ] **Step 7: Commit**

```bash
git add backend/server.js
git commit -m "Expone tier y cupo de simulacros en /users/check-subscription"
```

---

### Task 6: Resolve tier from Stripe price ID on purchase

**Files:**
- Modify: `backend/server.js`

- [ ] **Step 1: Add the price→tier map config**

In `backend/server.js`, find (near line 20):

```js
const stripe = Stripe(process.env.STRIPE_SECRET);
```

Add right after it:

```js
const stripe = Stripe(process.env.STRIPE_SECRET);
const STRIPE_PRICE_TIER_MAP = (() => {
  try {
    return JSON.parse(process.env.STRIPE_PRICE_TIER_MAP || '{}');
  } catch (err) {
    console.error('STRIPE_PRICE_TIER_MAP inválido (debe ser JSON), usando mapa vacío:', err.message);
    return {};
  }
})();
```

Add `resolveTierFromPriceId` to the `tierService` import from Task 4, Step 1:

```js
const {
  EXPLORAR_ALLOWED_EXAM_TYPE,
  ENTRADA_MONTHLY_LIMIT,
  resolveTierFromPriceId,
  computeEffectiveTier,
  checkEntradaAllowance,
  getCurrentPeriodUsage,
  consumeEntradaSimulacro,
} = require('./services/tierService');
```

- [ ] **Step 2: Resolve tier in the Stripe webhook (`checkout.session.completed`)**

In `backend/server.js`, find (around line 3489, inside the `checkout.session.completed` case):

```js
            if (subscriptions.data.length > 0) {
              const subscription = subscriptions.data[0];
              const item = subscription.items.data[0];
              const priceId = item?.price?.id;
              const interval = item?.price?.recurring?.interval;

              // Deducir plan por intervalo para no depender de priceIds hardcodeados
              if (interval === 'month') finalPlan = 'mensual';
              if (interval === 'year') finalPlan = 'anual';

              console.log(`💳 STRIPE WEBHOOK: Plan obtenido desde suscripción: ${finalPlan} (interval: ${interval}, priceId: ${priceId})`);
            }
```

Replace with:

```js
            if (subscriptions.data.length > 0) {
              const subscription = subscriptions.data[0];
              const item = subscription.items.data[0];
              const priceId = item?.price?.id;
              const interval = item?.price?.recurring?.interval;

              // Deducir plan por intervalo para no depender de priceIds hardcodeados
              if (interval === 'month') finalPlan = 'mensual';
              if (interval === 'year') finalPlan = 'anual';

              finalTier = resolveTierFromPriceId(priceId, STRIPE_PRICE_TIER_MAP);

              console.log(`💳 STRIPE WEBHOOK: Plan obtenido desde suscripción: ${finalPlan} (interval: ${interval}, priceId: ${priceId}, tier: ${finalTier})`);
            }
```

Now declare `finalTier` before this block. Find (around line 3476, right before the `let finalPlan = plan;` line):

```js
        // Si no se pudo determinar el plan desde metadata, obtenerlo desde la suscripción
        let finalPlan = plan;
```

Replace with:

```js
        // Si no se pudo determinar el plan desde metadata, obtenerlo desde la suscripción
        let finalPlan = plan;
        let finalTier = null;
```

- [ ] **Step 3: Persist the resolved tier**

In `backend/server.js`, find the `User.findOneAndUpdate` call in this same webhook handler (around line 3510):

```js
        const updatedUser = await User.findOneAndUpdate(
          { userId: effectiveUserId },
          { 
            plan: finalPlan, // Usar el plan final determinado
            email: email || effectiveUserId,
            userName: userName || effectiveUserId,
            stripeId: session.customer || undefined, // Guardar siempre el stripeId
            $setOnInsert: {
              examHistory: [],
              failedQuestions: []
            }
          },
          { upsert: true, new: true }
        );
```

Replace with:

```js
        const updatedUser = await User.findOneAndUpdate(
          { userId: effectiveUserId },
          { 
            plan: finalPlan, // Usar el plan final determinado
            ...(finalTier && { tier: finalTier }),
            email: email || effectiveUserId,
            userName: userName || effectiveUserId,
            stripeId: session.customer || undefined, // Guardar siempre el stripeId
            $setOnInsert: {
              examHistory: [],
              failedQuestions: []
            }
          },
          { upsert: true, new: true }
        );
```

(Price IDs not present in `STRIPE_PRICE_TIER_MAP` — including the current 89 € legacy flow — resolve `finalTier` to `null`, so `tier` is left untouched and `computeEffectiveTier`'s fallback treats the user as `plaza`, exactly as specified.)

- [ ] **Step 4: Resolve tier in `/stripe/confirm-checkout`**

In `backend/server.js`, find inside `app.post('/stripe/confirm-checkout', ...)` (around line 3275):

```js
    const interval = subscription?.items?.data?.[0]?.price?.recurring?.interval;
    let finalPlan = null;
    if (interval === 'month') finalPlan = 'mensual';
    if (interval === 'year') finalPlan = 'anual';
```

Replace with:

```js
    const priceId = subscription?.items?.data?.[0]?.price?.id;
    const interval = subscription?.items?.data?.[0]?.price?.recurring?.interval;
    let finalPlan = null;
    if (interval === 'month') finalPlan = 'mensual';
    if (interval === 'year') finalPlan = 'anual';
    const finalTier = resolveTierFromPriceId(priceId, STRIPE_PRICE_TIER_MAP);
```

Then find the `User.findOneAndUpdate` a few lines below it:

```js
    const updatedUser = await User.findOneAndUpdate(
      { userId },
      {
        plan: finalPlan,
        email: normalizedEmail || emailFromStripe || userId,
        stripeId: session.customer || undefined,
        expirationDate: expirationDate || undefined,
        $setOnInsert: { examHistory: [], failedQuestions: [] }
      },
      { upsert: true, new: true }
    );
```

Replace with:

```js
    const updatedUser = await User.findOneAndUpdate(
      { userId },
      {
        plan: finalPlan,
        ...(finalTier && { tier: finalTier }),
        email: normalizedEmail || emailFromStripe || userId,
        stripeId: session.customer || undefined,
        expirationDate: expirationDate || undefined,
        $setOnInsert: { examHistory: [], failedQuestions: [] }
      },
      { upsert: true, new: true }
    );
```

- [ ] **Step 5: Manual verification**

Set `STRIPE_PRICE_TIER_MAP='{"price_test_explorar":"explorar"}'` in the backend `.env`, use the Stripe CLI (`stripe trigger checkout.session.completed`) or a test-mode checkout against a price with that ID, and confirm the resulting user document in MongoDB has `tier: 'explorar'`. Repeat with a price ID not in the map and confirm `tier` stays `null` (and `computeEffectiveTier` still resolves to `'plaza'` via the fallback, checked by re-running `/users/check-subscription` for that user).

- [ ] **Step 6: Commit**

```bash
git add backend/server.js
git commit -m "Resuelve el tier del usuario desde el price ID de Stripe al confirmar el pago"
```

---

### Task 7: Document the new env var

**Files:**
- Modify: `backend/.env.example` (create if it doesn't exist — check first with `ls backend/.env*`)

- [ ] **Step 1: Check whether an example env file exists**

Run: `ls backend/.env* 2>/dev/null`

- [ ] **Step 2: Add the variable**

If `backend/.env.example` exists, add this line (with a comment):

```
# Mapa JSON de Price ID de Stripe -> tier ('explorar' | 'plaza'). Ejemplo:
# STRIPE_PRICE_TIER_MAP={"price_123":"explorar","price_456":"plaza"}
STRIPE_PRICE_TIER_MAP={}
```

If no `.env.example` file exists in the repo, skip this task — don't introduce a new convention unilaterally.

- [ ] **Step 3: Commit (only if Step 2 made a change)**

```bash
git add backend/.env.example
git commit -m "Documenta STRIPE_PRICE_TIER_MAP en .env.example"
```

---

### Task 8: Lock exam modes in the sidebar for Explorar

**Files:**
- Modify: `frontend/src/components/sidebar.jsx`

- [ ] **Step 1: Add `lockedModeIds` prop and locked-click handling**

In `frontend/src/components/sidebar.jsx`, find the props destructuring (around line 43):

```js
export default function Sidebar({
  isCollapsed,
  toggleCollapsed,
  isDarkMode,
  toggleDarkMode,
  onTutorialClick,
  onResourcesClick,
  onSurveyClick,
  isResourcesLocked = false,
  isCommunityLocked = false,
```

Add a new prop right after `isCommunityLocked = false,`:

```js
  isCommunityLocked = false,
  lockedModeIds = new Set(),
  simulacrosUsed = 0,
  simulacrosLimit = 4,
```

- [ ] **Step 2: Add a locked-navigation handler**

Find `handleNavigate` (around line 59):

```js
  const handleNavigate = (path) => {
    localStorage.removeItem('userAnswers')
    localStorage.removeItem('progresoExamen')
    navigate(path)
    setIsMobileOpen(false)
  }
```

Add a new function right after it:

```js
  const handleModeClick = (item) => {
    if (lockedModeIds.has(item.id)) {
      toast.error('Este modo requiere el plan Voy a por la plaza')
      setIsMobileOpen(false)
      return
    }
    handleNavigate(item.path)
  }
```

- [ ] **Step 3: Wire the locked state into the desktop menu (first `menuItems.map`)**

Find (around line 157):

```js
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.path)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent hover:text-accent-foreground',
                    isCollapsed && 'justify-center'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {!isCollapsed && <span>{item.label}</span>}
                </button>
              )
            })}
```

Replace with:

```js
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              const isLocked = lockedModeIds.has(item.id)

              return (
                <button
                  key={item.id}
                  onClick={() => handleModeClick(item)}
                  disabled={isLocked}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent hover:text-accent-foreground',
                    isCollapsed && 'justify-center',
                    isLocked && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {isLocked && <Lock className="h-4 w-4 text-destructive" />}
                  {!isCollapsed && (
                    <span>
                      {item.label}
                      {item.id === 'simulacro' && simulacrosUsed !== null && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({simulacrosUsed}/{simulacrosLimit})
                        </span>
                      )}
                    </span>
                  )}
                </button>
              )
            })}
```

- [ ] **Step 4: Wire the locked state into the mobile menu (second `menuItems.map`)**

Find (around line 295):

```js
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.path)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              )
            })}
```

Replace with:

```js
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              const isLocked = lockedModeIds.has(item.id)

              return (
                <button
                  key={item.id}
                  onClick={() => handleModeClick(item)}
                  disabled={isLocked}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent hover:text-accent-foreground',
                    isLocked && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {isLocked && <Lock className="h-4 w-4 text-destructive" />}
                  <span>
                    {item.label}
                    {item.id === 'simulacro' && simulacrosUsed !== null && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({simulacrosUsed}/{simulacrosLimit})
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
```

- [ ] **Step 5: Manual verification**

Not automated (no component test infra for `sidebar.jsx` today) — verified end-to-end in Task 9's manual verification step, once `Dashboard.js` actually passes `lockedModeIds`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/sidebar.jsx
git commit -m "Añade bloqueo visual de modos de examen en el sidebar para el plan Explorar"
```

---

### Task 9: Wire tier data from Dashboard into the Sidebar

**Files:**
- Modify: `frontend/src/Dashboard.js`

- [ ] **Step 1: Extend the existing subscription-policy fetch**

In `frontend/src/Dashboard.js`, find the state declarations (around line 60):

```js
  const [resourcesLocked, setResourcesLocked] = useState(false);
  const [communityLocked, setCommunityLocked] = useState(false);
```

Add right after:

```js
  const [resourcesLocked, setResourcesLocked] = useState(false);
  const [communityLocked, setCommunityLocked] = useState(false);
  const [lockedModeIds, setLockedModeIds] = useState(new Set());
  const [simulacrosUsed, setSimulacrosUsed] = useState(0);
  const [simulacrosLimit, setSimulacrosLimit] = useState(4);
```

- [ ] **Step 2: Compute locked modes from the tier in the fetch effect**

Find (around line 95):

```js
        const data = await response.json();
        const resourcesAllowed = data?.resourcesAccessAllowed ?? true;
        const communityAllowed = data?.communityAccessAllowed ?? true;
        setResourcesLocked(resourcesAllowed === false);
        setCommunityLocked(communityAllowed === false);
      } catch (err) {
        console.error('Error al cargar política de acceso:', err);
        // Stand-by: si falla, no bloqueamos por seguridad.
        setResourcesLocked(false);
        setCommunityLocked(false);
      }
```

Replace with:

```js
        const data = await response.json();
        const resourcesAllowed = data?.resourcesAccessAllowed ?? true;
        const communityAllowed = data?.communityAccessAllowed ?? true;
        setResourcesLocked(resourcesAllowed === false);
        setCommunityLocked(communityAllowed === false);

        const tier = data?.tier ?? null;
        const EXPLORAR_LOCKED_MODE_IDS = new Set(['quizz', 'errores', 'protocolos', 'contrarreloj', 'personalizado']);
        setLockedModeIds(tier === 'explorar' ? EXPLORAR_LOCKED_MODE_IDS : new Set());
        setSimulacrosUsed(data?.simulacrosUsed ?? 0);
        setSimulacrosLimit(data?.simulacrosLimit ?? 4);
      } catch (err) {
        console.error('Error al cargar política de acceso:', err);
        // Stand-by: si falla, no bloqueamos por seguridad.
        setResourcesLocked(false);
        setCommunityLocked(false);
        setLockedModeIds(new Set());
      }
```

- [ ] **Step 3: Pass the new state into `<Sidebar>`**

Find (around line 2404):

```js
        <Sidebar 
          isCollapsed={isCollapsed}
          toggleCollapsed={toggleSidebar}
          isDarkMode={isDarkMode}
          toggleDarkMode={handleToggleDarkMode}
          onTutorialClick={openTutorialModal}
          isResourcesLocked={resourcesLocked}
          isCommunityLocked={communityLocked}
          onResourcesClick={() => {
            if (resourcesLocked) return;
            setShowResourcesModal(true);
          }}
          onSurveyClick={() => setShowSurveyModal(true)}
        />
```

Replace with:

```js
        <Sidebar 
          isCollapsed={isCollapsed}
          toggleCollapsed={toggleSidebar}
          isDarkMode={isDarkMode}
          toggleDarkMode={handleToggleDarkMode}
          onTutorialClick={openTutorialModal}
          isResourcesLocked={resourcesLocked}
          isCommunityLocked={communityLocked}
          lockedModeIds={lockedModeIds}
          simulacrosUsed={simulacrosUsed}
          simulacrosLimit={simulacrosLimit}
          onResourcesClick={() => {
            if (resourcesLocked) return;
            setShowResourcesModal(true);
          }}
          onSurveyClick={() => setShowSurveyModal(true)}
        />
```

- [ ] **Step 4: Manual verification (end-to-end)**

1. In MongoDB, set a test user's `tier` to `'explorar'` and `entradaUsage` to `{ periodStart: new Date(), simulacrosUsed: 1 }`.
2. Log into the app as that user, open the Dashboard.
3. Confirm in the sidebar: Simulacro EIR shows `(1/4)` and is clickable; Quizz, Repite Errores, Protocolario, Contrarreloj and Personalizado are grayed out with a lock icon and produce a toast (`"Este modo requiere el plan Voy a por la plaza"`) instead of navigating when clicked.
4. Set `tier` to `'plaza'` for the same user, reload, and confirm nothing is locked.
5. Set `tier` to `null` with `plan: 'mensual'` (simulating a legacy subscriber) and confirm nothing is locked either (fallback working).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/Dashboard.js
git commit -m "Conecta el estado del sidebar con el tier del usuario"
```

---

## Self-review notes

- **Spec coverage:** tier model + fallback (Task 1, 2), Explorar allowed exam type + monthly limit with 30-day reset (Task 3), enforcement on save (Task 4), status reporting (Task 5), Stripe tier resolution for new purchases (Task 6), visual lock without hiding (Task 8, 9). Out-of-scope items from the spec (Precios.js copy, new Stripe Price IDs, annual Pro option) are explicitly not tasked, matching the spec's "Fuera de alcance" section.
- **Type consistency:** `tier` values (`'explorar'`/`'plaza'`), `examType` value (`'simulacro'`), and the `entradaUsage` shape (`{ periodStart, simulacrosUsed }`) are used identically across `tierService.js`, `server.js`, and the frontend.
- **No placeholders:** every step includes literal code to write, not a description of what to write.
