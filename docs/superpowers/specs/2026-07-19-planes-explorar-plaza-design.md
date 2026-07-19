# Diseño: Tiers "Explorar" y "Voy a por la plaza"

## Contexto

Simulia vende hoy un único producto (pago único de 89 €, "Voy a por la plaza") con
acceso completo. El objetivo es introducir un segundo nivel de entrada, mensual y de
bajo compromiso ("Explorar"), que sirva como wedge para que la mayoría de usuarios
fríos (tráfico de Meta Ads) acabe subiendo al plan completo. El precio de cada plan
se decide más adelante; este documento cubre solo la infraestructura de datos,
backend y frontend necesaria para soportar dos tiers con acceso diferenciado.

Este documento asume conocido el sistema actual (ver exploración en la conversación):
`User.plan` (`mensual`/`anual`) es la **frecuencia de cobro**, no el nivel de acceso;
hoy el acceso es binario vía middleware `verifySubscription`. Introducimos un eje
nuevo e independiente, `tier`, para el nivel de acceso.

## Nombres de los planes

- **Explorar** — plan de entrada, mensual, bajo compromiso.
- **Voy a por la plaza** — plan completo (nombre ya usado hoy en `Precios.js` para
  el producto de pago único; se reutiliza para el plan superior).

Slugs internos (valores de `tier` en BD): `explorar` y `plaza`.

## Qué incluye cada plan

**Explorar:**
- Único modo de examen permitido: **Simulacro EIR** (`type: 'simulacro'`, 175
  preguntas / formato oficial). Protocolario (`type: 'protocolos'`) **no** está
  incluido — solo cuenta el simulacro estándar.
- Límite: 4 simulacros completados por mes (ventana de 30 días desde el alta o
  desde el último reseteo, no mes natural).
- Sin acceso a: Quizz Rápido, Repite Errores, Contrarreloj, Personalizado, banco de
  preguntas por tema, WhatsApp, chatbot IA, analítica/seguimiento de progreso.
- Estas secciones bloqueadas **se muestran siempre**, en gris, con candado y sin
  poder interactuar (no se ocultan) — refuerzan que hay más disponible en el plan
  superior.

**Voy a por la plaza:**
- Todo ilimitado: los 6 modos de examen, banco de preguntas completo, WhatsApp,
  chatbot IA, analítica de progreso.

**Usuarios ya suscritos hoy:** se tratan como `plaza` automáticamente y no pierden
nada de su acceso actual (ver "Compatibilidad" más abajo). Este tier nuevo solo
aplica a altas nuevas a partir de que se lance.

**Historial al hacer upgrade:** el histórico de exámenes ya vive ligado a
`userId` (`User.examHistory`, `ExamenResultado.userId`), no al plan — no requiere
migración; un usuario que pasa de Explorar a Voy a por la plaza conserva todo su
progreso y métricas sin partir de cero.

## Modelo de datos (`backend/models/User.js`)

Añadir dos campos nuevos, sin tocar `plan` (que sigue siendo mensual/anual):

```js
tier: { type: String, enum: ['explorar', 'plaza'], default: null },
entradaUsage: {
  periodStart: { type: Date },
  simulacrosUsed: { type: Number, default: 0 }
}
```

`entradaUsage` solo es relevante para `tier: 'explorar'`; se ignora para `plaza`.

## Compatibilidad con suscriptores actuales

Regla de fallback en el momento de comprobar acceso (no requiere script de
migración porque hoy no hay tiers asignados):

> Si `user.plan` está activo (`mensual` o `anual`) y `user.tier` es `null`,
> tratar como `tier: 'plaza'`.

Esto cubre tanto a los suscriptores ya activos como cualquier compra vía el
Price ID legacy de 89 € mientras no se les asigne un `tier` explícito.

## Backend: middleware y enforcement

**`requireTier('plaza')`** — nuevo middleware, hermano de `verifySubscription`
(que sigue comprobando que hay suscripción activa en absoluto). Se usa en rutas
100% exclusivas de plaza (banco de preguntas por tema, WhatsApp, chatbot,
analítica).

**Enforcement de Explorar** — nueva función `enforceExplorarLimits`, aplicada
tras `verifySubscription` en las rutas que sirven o guardan exámenes:

- `/random-questions`, `/random-questions-contrarreloj`, `/create-custom-exam`,
  `/protocol-questions`, `/random-question-completos` — si `tier === 'explorar'`
  y el `type` solicitado no es `'simulacro'`, devolver 403
  (`"Este modo requiere el plan Voy a por la plaza"`).
- Antes de servir preguntas de tipo `simulacro` a un usuario `explorar`, comprobar
  `entradaUsage.simulacrosUsed < 4` dentro de la ventana vigente; si no, 403
  (`"Has usado tus 4 simulacros de este mes"`).
- `/validate-and-save-exam` — al guardar un examen `type: 'simulacro'` con
  `status: 'completed'` para un usuario `explorar`, incrementar
  `entradaUsage.simulacrosUsed`. Si `now > periodStart + 30 días`, resetear
  `simulacrosUsed = 0` y `periodStart = now` antes de incrementar.
- El contador se incrementa **al completar**, no al empezar — abandonar un
  examen a mitad no consume el cupo.

Rutas no tocadas: todo lo que no sirve/guarda contenido de examen (perfil,
racha, preferencias de práctica) sigue igual para ambos tiers.

## Stripe / webhook

- Nuevo mapa de configuración `STRIPE_PRICE_TIER_MAP` (env-driven, `priceId ->
  tier`). Se rellena cuando existan los Price IDs reales de Explorar/Plaza en
  Stripe (pendiente de precio final).
- En el webhook de Stripe (`checkout.session.completed` /
  `customer.subscription.updated`), al resolver el plan desde el price ID,
  resolver también el `tier` con ese mapa.
- Cualquier price ID no presente en el mapa (incluyendo el flujo actual de 89 €)
  cae en `tier: 'plaza'` por defecto — mismo mecanismo que protege a los
  suscriptores actuales, sin caso especial adicional.

## Frontend

**Componente `<LockedFeature>`** (nuevo, en `frontend/src/components/`): envuelve
una tarjeta/sección. Si el usuario no tiene el tier requerido, la renderiza en
gris, con icono de candado, sin `onClick` funcional, y un CTA "Desbloquea con Voy
a por la plaza" que enlaza a `/precios`. No la oculta.

**Hook `useTier()`** (nuevo, en `frontend/src/context` o `frontend/src/lib`):
expone `{ tier, simulacrosUsed, simulacrosLimit }`, obtenido extendiendo la
respuesta actual de `/verify-subscription` (o un endpoint nuevo equivalente) para
incluir el tier.

**Aplicación del bloqueo:**
- `exam-mode-selector.jsx`: Quizz, Repite Errores, Contrarreloj y Personalizado
  envueltos en `<LockedFeature>` para `tier === 'explorar'`. La tarjeta de
  Simulacro EIR muestra además un badge "X/4 este mes" cuando `tier ===
  'explorar'`. Protocolario también queda bloqueado para `explorar` (no incluido,
  igual que el resto de modos no-simulacro).
- Banco de preguntas por tema, WhatsApp, chatbot (`ChatBot.js` /
  `ai-assistant.jsx`) y vista de progreso (`TimelineProgress.js` y análogos):
  mismo tratamiento con `<LockedFeature>`.

## Fuera de alcance en esta iteración

- No se toca `Precios.js` (copy, precios, Price IDs de Stripe) — a la espera de
  precio final.
- No se crean los Price IDs en Stripe (acción manual en el dashboard de Stripe
  cuando haya precio).
- No se añade opción anual para "Voy a por la plaza" todavía.
- No se migra a usuarios existentes con script — el fallback en tiempo de
  comprobación cubre el caso sin tocar datos.

## Testing

- Backend: tests de `enforceExplorarLimits` cubriendo — tipo no permitido para
  `explorar`, límite de 4 alcanzado, reset tras 30 días, incremento solo al
  completar (no al empezar/abandonar), fallback `plan` activo + `tier` null →
  tratado como `plaza`.
- Backend: test del middleware `requireTier('plaza')` rechazando `explorar` y
  usuarios sin tier.
- Frontend: test de `<LockedFeature>` renderizando bloqueado/desbloqueado según
  tier, sin `onClick` activo cuando bloqueado.
