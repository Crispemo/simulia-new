# Lógica de Webhooks y Recordatorios - Simulia

## 📋 Resumen del Sistema

El sistema de recordatorios de Simulia funciona con dos componentes principales:
1. **Contabilización de tiempo** (en la base de datos)
2. **Envío de notificaciones** (webhook + fallback email)

## 🕐 Contabilización del Tiempo

### Campos en la Base de Datos (User Model)
```javascript
{
  lastActivityAt: Date,           // Última vez que el usuario hizo algo significativo
  practicePreferences: {
    cadenceDays: Number,          // Cada cuántos días recordar (1-30)
    emailReminders: Boolean,      // Si quiere recibir recordatorios
    channel: String,              // 'email' o 'sms'
    emailOverride: String,        // Email alternativo (opcional)
    phoneE164: String            // Teléfono en formato E.164 (opcional)
  },
  lastReminderSentAt: Date,       // Cuándo se envió el último recordatorio
  remindersCount: Number          // Cuántos recordatorios se han enviado
}
```

### ¿Cuándo se actualiza `lastActivityAt`?
- **NO se actualiza automáticamente** - debe llamarse manualmente
- Se actualiza cuando el usuario:
  - Completa un examen
  - Hace una práctica significativa
  - Interactúa con el sistema de forma relevante

### Endpoint para Actualizar Actividad
```http
POST /practice-activity/:userId
```
**IMPORTANTE**: Este endpoint debe llamarse desde el frontend cuando el usuario haga algo significativo.

## 🔔 Sistema de Recordatorios

### Lógica de Decisión
```javascript
// En notificationService.js
const cadenceDays = user.practicePreferences?.cadenceDays || 3;
const cutoffMs = cadenceDays * 24 * 60 * 60 * 1000;
const lastActivity = user.lastActivityAt || user.updatedAt || user.createdAt;
const diff = now - new Date(lastActivity);

// Enviar recordatorio si:
// 1. Han pasado más días de los configurados
// 2. No se ha enviado un recordatorio reciente
if (diff >= cutoffMs && !recentReminder) {
  // Enviar recordatorio
}
```

### Flujo de Envío
1. **Prioridad 1**: Webhook (si está configurado)
2. **Prioridad 2**: Email directo (si canal es 'email')

### Configuración del Webhook
```bash
# Variable de entorno en el servidor
NOTIFICATION_WEBHOOK_URL=https://tu-webhook-url.com/endpoint
```

### Payload del Webhook
```json
{
  "type": "practice_reminder",
  "userId": "ogxMtMo5f1gjk5AoUkZjXfgEmUz1",
  "email": "usuario@email.com",
  "phoneE164": "+34674957972",
  "channel": "email",
  "cadenceDays": 3,
  "lastActivityAt": "2025-01-15T10:30:00.000Z",
  "remindersCount": 2,
  "timestamp": "2025-01-18T10:30:00.000Z"
}
```

## 🚀 Cómo Configurar la Automatización

### Opción 1: Usar n8n (Recomendado)
1. Crear un workflow en n8n
2. Configurar webhook trigger
3. Añadir nodos para:
   - Enviar email (Gmail, SendGrid, etc.)
   - Enviar SMS (Twilio, etc.)
   - Guardar logs

### Opción 2: Usar Zapier
1. Crear un Zap con webhook trigger
2. Conectar con servicios de email/SMS
3. Configurar la URL del webhook en `NOTIFICATION_WEBHOOK_URL`

### Opción 3: Crear tu propio servicio
```javascript
// Ejemplo de endpoint que recibe el webhook
app.post('/webhook/reminders', (req, res) => {
  const { userId, email, phoneE164, channel, cadenceDays } = req.body;
  
  if (channel === 'email') {
    // Enviar email
    sendEmail(email, `¡Hace ${cadenceDays} días que no practicas!`);
  } else if (channel === 'sms') {
    // Enviar SMS
    sendSMS(phoneE164, `¡Hace ${cadenceDays} días que no practicas!`);
  }
  
  res.json({ success: true });
});
```

## 🔧 Endpoints Disponibles

### Verificar Estado del Usuario
```http
GET /user-status/:userId
```
Devuelve toda la información del usuario y si debería recibir recordatorio.

### Probar Recordatorios (Desarrollo)
```http
POST /test-reminders
```
Ejecuta el proceso de recordatorios para todos los usuarios.

### Actualizar Actividad del Usuario
```http
POST /practice-activity/:userId
```
Actualiza `lastActivityAt` del usuario.

## ⚠️ Problemas Comunes

### 1. Los recordatorios no se envían
- Verificar que `lastActivityAt` se actualiza correctamente
- Verificar que `emailReminders` está en `true`
- Verificar que el webhook está configurado o el email funciona

### 2. Se envían recordatorios muy frecuentes
- Verificar que `lastReminderSentAt` se actualiza después de enviar
- Verificar la lógica de `cutoffMs`

### 3. El teléfono no se guarda
- Verificar formato E.164: debe empezar con `+` y tener 8-15 dígitos
- Ejemplo correcto: `+34674957972`
- Ejemplo incorrecto: `674957972`

## 📝 Próximos Pasos Recomendados

1. **Implementar actualización automática de `lastActivityAt`** en:
   - Completar exámenes
   - Hacer prácticas
   - Interacciones significativas

2. **Configurar webhook** para automatización externa

3. **Añadir más logs** para debugging

4. **Crear dashboard** para monitorear recordatorios enviados
