const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Obtener preferencias de práctica
router.get('/practice-preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    return res.json(user.practicePreferences || {});
  } catch (err) {
    console.error('Error GET practice-preferences:', err.message);
    return res.status(500).json({ message: 'Error del servidor' });
  }
});

// Guardar preferencias de práctica
router.put('/practice-preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { cadenceDays, channel, emailReminders, emailOverride, phoneE164 } = req.body;
    
    console.log('🔄 Guardando preferencias de práctica para userId:', userId);
    console.log('📝 Datos recibidos:', { cadenceDays, channel, emailReminders, emailOverride, phoneE164 });
    
    const user = await User.findOne({ userId });
    if (!user) {
      console.log('❌ Usuario no encontrado:', userId);
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const oldPreferences = user.practicePreferences || {};
    user.practicePreferences = {
      cadenceDays: Math.max(1, Math.min(30, parseInt(cadenceDays) || 3)),
      channel: ['email', 'sms', 'push'].includes(channel) ? channel : (oldPreferences.channel || 'email'),
      emailReminders: Boolean(emailReminders),
      emailOverride: emailOverride || oldPreferences.emailOverride,
      phoneE164: phoneE164 || oldPreferences.phoneE164
    };

    console.log('💾 Preferencias antes del guardado:', oldPreferences);
    console.log('💾 Preferencias después del guardado:', user.practicePreferences);

    await user.save();
    
    console.log('✅ Preferencias guardadas exitosamente en MongoDB para usuario:', userId);
    console.log('📊 Usuario actualizado:', {
      userId: user.userId,
      practicePreferences: user.practicePreferences,
      lastActivityAt: user.lastActivityAt,
      streak: user.streak
    });
    
    return res.json({ 
      success: true, 
      practicePreferences: user.practicePreferences,
      message: 'Preferencias guardadas correctamente en la base de datos'
    });
  } catch (err) {
    console.error('❌ Error PUT practice-preferences:', err.message);
    console.error('❌ Stack trace:', err.stack);
    return res.status(500).json({ message: 'Error del servidor al guardar preferencias' });
  }
});

// Registrar actividad de práctica (puede llamarse en acciones significativas)
router.post('/practice-activity/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const now = new Date();
    user.lastActivityAt = now;
    await user.save();
    return res.json({ success: true, lastActivityAt: user.lastActivityAt });
  } catch (err) {
    console.error('Error POST practice-activity:', err.message);
    return res.status(500).json({ message: 'Error del servidor' });
  }
});

// Endpoint para verificar estado del usuario y sus preferencias
router.get('/user-status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const now = new Date();
    const lastActivity = user.lastActivityAt || user.updatedAt || user.createdAt;
    const daysSinceActivity = lastActivity ? Math.floor((now - new Date(lastActivity)) / (1000 * 60 * 60 * 24)) : 0;
    
    const status = {
      userId: user.userId,
      email: user.email,
      practicePreferences: user.practicePreferences || {},
      streak: user.streak || { current: 0, best: 0 },
      lastActivityAt: user.lastActivityAt,
      daysSinceActivity,
      lastReminderSentAt: user.lastReminderSentAt,
      remindersCount: user.remindersCount || 0,
      shouldReceiveReminder: false
    };

    // Calcular si debería recibir recordatorio
    if (user.practicePreferences?.emailReminders && user.practicePreferences?.cadenceDays) {
      const cadenceDays = user.practicePreferences.cadenceDays;
      status.shouldReceiveReminder = daysSinceActivity >= cadenceDays;
    }

    console.log('📊 Estado del usuario:', status);
    return res.json(status);
  } catch (err) {
    console.error('Error GET user-status:', err.message);
    return res.status(500).json({ message: 'Error del servidor' });
  }
});

// Endpoint de prueba para recordatorios (solo para desarrollo)
router.post('/test-reminders', async (req, res) => {
  try {
    const { processInactiveUsersForReminders } = require('../services/notificationService');
    console.log('🧪 Ejecutando prueba de recordatorios...');
    await processInactiveUsersForReminders();
    return res.json({ success: true, message: 'Prueba de recordatorios ejecutada' });
  } catch (err) {
    console.error('Error en prueba de recordatorios:', err.message);
    return res.status(500).json({ message: 'Error en prueba de recordatorios' });
  }
});

module.exports = router;





