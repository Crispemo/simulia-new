const { sendSubscriptionEmail } = require('./emailService');
const User = require('../models/User');
const axios = require('axios');

// Plantilla simple de recordatorio
function buildReminderEmailHtml(user, days) {
  return `
    <h1>¡Mantén tu racha en Simulia!</h1>
    <p>Hace ${days} días que no practicas. Tu progreso te espera.</p>
    <p><a href="https://www.simulia.es">Volver a practicar</a></p>
  `;
}

async function sendReminderEmail(user, days) {
  const email = user.practicePreferences?.emailOverride || user.email;
  if (!email) return false;
  
  // Crear un transporter temporal para enviar el recordatorio personalizado
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransporter({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: `🔥 ¡Mantén tu racha en Simulia! - ${days} días sin practicar`,
    html: buildReminderEmailHtml(user, days)
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Recordatorio enviado a ${email}`);
    return true;
  } catch (error) {
    console.error(`❌ Error enviando recordatorio a ${email}:`, error.message);
    return false;
  }
}

async function sendReminderViaWebhook(user, days) {
  const url = process.env.NOTIFICATION_WEBHOOK_URL;
  if (!url) return false;
  const payload = {
    type: 'practice_reminder',
    userId: user.userId,
    email: user.practicePreferences?.emailOverride || user.email,
    phoneE164: user.practicePreferences?.phoneE164 || null,
    channel: user.practicePreferences?.channel || 'email',
    cadenceDays: user.practicePreferences?.cadenceDays || 3,
    lastActivityAt: user.lastActivityAt,
    remindersCount: user.remindersCount || 0,
    timestamp: new Date().toISOString()
  };
  try {
    await axios.post(url, payload, { timeout: 10000 });
    return true;
  } catch (e) {
    console.error('Webhook de recordatorio falló:', e.message);
    return false;
  }
}

async function processInactiveUsersForReminders() {
  const now = new Date();
  const users = await User.find({ 'practicePreferences.emailReminders': true });
  for (const user of users) {
    const cadenceDays = user.practicePreferences?.cadenceDays || 3;
    const cutoffMs = cadenceDays * 24 * 60 * 60 * 1000;
    const lastActivity = user.lastActivityAt || user.updatedAt || user.createdAt;
    if (!lastActivity) continue;
    const diff = now - new Date(lastActivity);

    // Evitar repetir en la misma ventana
    if (user.lastReminderSentAt && (now - new Date(user.lastReminderSentAt)) < cutoffMs) continue;

    if (diff >= cutoffMs) {
      const channel = user.practicePreferences?.channel || 'email';
      let sent = false;
      // Priorizar webhook si está configurado (permite email/SMS vía automatización externa)
      if (process.env.NOTIFICATION_WEBHOOK_URL) {
        sent = await sendReminderViaWebhook(user, cadenceDays);
      }
      // Fallback a email directo si no hay webhook o falló
      if (!sent && channel === 'email') {
        sent = await sendReminderEmail(user, cadenceDays);
      }
      if (sent) {
        user.lastReminderSentAt = now;
        user.remindersCount = (user.remindersCount || 0) + 1;
        await user.save();
      }
    }
  }
}

module.exports = { processInactiveUsersForReminders };


