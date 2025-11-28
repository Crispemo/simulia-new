const express = require('express');
const router = express.Router();
const { sendSurveyEmail } = require('../services/emailService');
const User = require('../models/User');

// Ruta para enviar respuestas de la encuesta
router.post('/api/survey/submit', async (req, res) => {
  try {
    console.log('🔧 SURVEY ROUTE DEBUG - Petición recibida:', {
      userId: req.body.userId,
      timestamp: req.body.timestamp,
      hasResponses: !!req.body.responses
    });
    
    const { responses, userId, timestamp } = req.body;
    
    if (!responses || Object.keys(responses).length === 0) {
      console.log('🔧 SURVEY ROUTE DEBUG - Error: Respuestas faltantes');
      return res.status(400).json({ message: 'Las respuestas son obligatorias' });
    }
    
    // Obtener email del usuario si se proporciona el userId
    let userEmail = null;
    let userName = null;
    if (userId && userId !== 'anonymous') {
      const user = await User.findOne({ userId: userId });
      if (user) {
        userEmail = user.email;
        userName = user.name || user.email;
        console.log('🔧 SURVEY ROUTE DEBUG - Usuario encontrado:', { email: userEmail, name: userName });
      } else {
        console.log('🔧 SURVEY ROUTE DEBUG - Usuario no encontrado:', userId);
      }
    }
    
    console.log('🔧 SURVEY ROUTE DEBUG - Enviando email con respuestas de la encuesta...');
    
    // Enviar el correo con las respuestas
    const success = await sendSurveyEmail(responses, userEmail, userName, userId, timestamp);
    
    console.log('🔧 SURVEY ROUTE DEBUG - Resultado del envío:', success);
    
    if (success) {
      return res.status(200).json({ 
        message: 'Encuesta enviada correctamente',
        success: true 
      });
    } else {
      return res.status(500).json({ message: 'Error al enviar la encuesta' });
    }
  } catch (error) {
    console.error('🔧 SURVEY ROUTE DEBUG - Error en la ruta de encuesta:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;



