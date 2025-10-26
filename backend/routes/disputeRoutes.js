const express = require('express');
const router = express.Router();
const { sendDisputeEmail } = require('../services/emailService');
const User = require('../models/User');

// Ruta para enviar impugnaciones
router.post('/send-dispute', async (req, res) => {
  try {
    console.log('🔧 DISPUTE ROUTE DEBUG - Petición recibida:', req.body);
    
    const { question, reason, userAnswer, userId } = req.body;
    
    if (!question) {
      console.log('🔧 DISPUTE ROUTE DEBUG - Error: Pregunta faltante');
      return res.status(400).json({ message: 'La pregunta es obligatoria' });
    }
    
    // Obtener email del usuario si se proporciona el userId
    let userEmail = null;
    if (userId) {
      const user = await User.findOne({ userId: userId });
      if (user) {
        userEmail = user.email;
        console.log('🔧 DISPUTE ROUTE DEBUG - Email del usuario encontrado:', userEmail);
      } else {
        console.log('🔧 DISPUTE ROUTE DEBUG - Usuario no encontrado:', userId);
      }
    }
    
    console.log('🔧 DISPUTE ROUTE DEBUG - Enviando email de impugnación...');
    
    // Enviar el correo de impugnación
    const success = await sendDisputeEmail(question, reason, userAnswer, userEmail, userId);
    
    console.log('🔧 DISPUTE ROUTE DEBUG - Resultado del envío:', success);
    
    if (success) {
      return res.status(200).json({ message: 'Impugnación enviada correctamente' });
    } else {
      return res.status(500).json({ message: 'Error al enviar la impugnación' });
    }
  } catch (error) {
    console.error('🔧 DISPUTE ROUTE DEBUG - Error en la ruta de impugnación:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router; 