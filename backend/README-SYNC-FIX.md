# Reparación de Sincronización Stripe ↔ MongoDB

## Problema Identificado

Se detectaron los siguientes problemas en la sincronización entre Stripe y MongoDB:

1. **Planes inválidos**: Los usuarios aparecían con plan "free" o "gratuito", que NO deben existir
2. **Asignación incorrecta**: Se asignaba "mensual" por defecto cuando no se podía determinar el plan
3. **Desincronización**: Más usuarios en Stripe que en MongoDB
4. **Falta de coherencia**: Los usuarios nuevos no se asignaban correctamente según su elección en Stripe
5. **Correos incorrectos**: Se enviaban correos de bienvenida a usuarios sin pago activo

## Solución Implementada

### 1. Correcciones en el Código

- **Modelo User.js**: 
  - Eliminados los planes "free" y "gratuito" del enum
  - Permitido `plan: null` para indicar errores o falta de selección
  - Solo permite "mensual" y "anual" como planes válidos
  - **IMPORTANTE**: Plan "free" NO debe existir nunca
- **Webhook de Stripe**: 
  - Validación estricta del plan antes de asignar
  - Si el plan no es válido, no se actualiza el usuario
  - No se asigna "mensual" por defecto
- **Registro de usuarios**: 
  - Validación del plan antes de crear/actualizar
  - Asignación de `plan: null` si no se proporciona un plan válido
- **Cancelación de suscripciones**: Los usuarios se eliminan de MongoDB cuando cancelan (ya que solo permitimos planes de pago)

### 2. Scripts de Reparación

#### `fix-user-sync.js` (Script Principal)
Script maestro que ejecuta toda la reparación en el orden correcto:

```bash
cd backend
node fix-user-sync.js
```

#### `migrate-invalid-plans.js`
Migra usuarios con planes inválidos:
- Usuarios con `stripeId` → plan establecido a `null` (hasta determinar el plan correcto)
- Usuarios sin `stripeId` → eliminados (no deberían existir sin suscripción)

#### `sync-stripe-mongodb.js`
Sincroniza usuarios entre Stripe y MongoDB:
- Crea usuarios en MongoDB basándose en clientes de Stripe con suscripciones activas y planes válidos
- Actualiza usuarios existentes con información de Stripe
- Establece `plan: null` para clientes con planes inválidos
- Elimina usuarios huérfanos (existen en MongoDB pero no en Stripe)

## Uso

### Ejecutar Reparación Completa
```bash
cd backend
node fix-user-sync.js
```

### Ejecutar Scripts Individuales
```bash
# Solo migrar planes inválidos
node migrate-invalid-plans.js

# Solo sincronizar desde Stripe
node sync-stripe-mongodb.js

# Verificar que no existan planes "free" (verificación rápida)
node check-no-free-plans.js
```

## Variables de Entorno Requeridas

Asegúrate de tener configuradas:
- `MONGODB_URI`: URI de conexión a MongoDB
- `STRIPE_SECRET_KEY`: Clave secreta de Stripe

## Resultado Esperado

Después de ejecutar la reparación:

1. ✅ **NO EXISTIRÁN planes "free"** - Si aparecen, indica un error en el proceso
2. ✅ Solo existirán planes válidos ("mensual" o "anual") o `null` (indicando error)
3. ✅ Coherencia total entre Stripe y MongoDB
4. ✅ Los usuarios nuevos se asignarán correctamente según su elección en Stripe
5. ✅ No habrá usuarios huérfanos o con planes inválidos
6. ✅ Los usuarios con errores tendrán `plan: null` en lugar de planes incorrectos
7. ✅ Solo usuarios con pagos válidos recibirán correos de bienvenida

## Validación

El script incluye validación automática que muestra:
- Distribución de planes por usuario (incluyendo `null`)
- Usuarios sin stripeId
- Usuarios con plan null
- Emails duplicados
- Resumen de operaciones realizadas

## Notas Importantes

- **Backup recomendado**: Haz backup de la base de datos antes de ejecutar
- **Ejecutar en producción**: Ejecuta primero en un entorno de prueba
- **Monitoreo**: Revisa los logs para verificar que todo funcione correctamente
- **Webhooks**: Los webhooks de Stripe seguirán funcionando normalmente después de la reparación
