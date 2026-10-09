const express = require('express');
const router = express.Router();
const { sendDisputeEmail } = require('../services/emailService');
const User = require('../models/User');
const Dispute = require('../models/Dispute');

// Ventana para ignorar envíos duplicados (doble clic en "Impugnar")
const DUPLICATE_WINDOW_MS = 2 * 60 * 1000;

// Ruta para enviar impugnaciones
router.post('/send-dispute', async (req, res) => {
  try {
    const { question, reason, userAnswer, userId } = req.body;
    const questionId = req.body.questionId || req.body._id || null;

    if (!question) {
      return res.status(400).json({ message: 'La pregunta es obligatoria' });
    }

    // Evitar impugnaciones duplicadas del mismo usuario sobre la misma pregunta
    const since = new Date(Date.now() - DUPLICATE_WINDOW_MS);
    const duplicateQuery = {
      question,
      submittedAt: { $gte: since },
      ...(userId ? { userId } : {}),
      ...(questionId ? { questionId: String(questionId) } : {})
    };
    const recent = await Dispute.findOne(duplicateQuery).sort({ submittedAt: -1 });
    if (recent) {
      // Si la segunda trae motivo y la primera no, lo completamos sin reenviar email
      if (reason && !recent.reason) {
        recent.reason = reason;
        await recent.save();
      }
      return res.status(200).json({ message: 'Impugnación ya recibida', duplicate: true });
    }

    // Obtener email del usuario si se proporciona el userId
    let userEmail = null;
    if (userId) {
      const user = await User.findOne({ userId });
      if (user) userEmail = user.email;
    }

    // Guardar la impugnación en MongoDB
    const dispute = await Dispute.create({
      questionId: questionId ? String(questionId) : null,
      question,
      reason: reason || '',
      userAnswer: userAnswer ?? null,
      userId: userId || null,
      userEmail
    });

    // Enviar el correo de impugnación (si falla, la impugnación queda guardada igualmente)
    let success = false;
    try {
      success = await sendDisputeEmail(question, reason, userAnswer, userEmail, userId, questionId);
    } catch (emailError) {
      console.error('Error enviando email de impugnación:', emailError);
    }
    dispute.emailSent = !!success;
    await dispute.save();

    return res.status(200).json({ message: 'Impugnación enviada correctamente', disputeId: dispute._id });
  } catch (error) {
    console.error('Error en la ruta de impugnación:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;
