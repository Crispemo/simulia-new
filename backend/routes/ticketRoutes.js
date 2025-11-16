const express = require('express');
const router = express.Router();
const { sendTicketEmail } = require('../services/emailService');
const User = require('../models/User');

// Ruta para enviar tickets/incidencias
router.post('/send-ticket', async (req, res) => {
  try {
    console.log('🔧 TICKET ROUTE DEBUG - Petición recibida:', req.body);
    
    const { subject, description, userId } = req.body;
    
    if (!description) {
      console.log('🔧 TICKET ROUTE DEBUG - Error: Descripción faltante');
      return res.status(400).json({ message: 'La descripción es obligatoria' });
    }
    
    // Obtener email del usuario si se proporciona el userId
    let userEmail = null;
    if (userId) {
      const user = await User.findOne({ userId: userId });
      if (user) {
        userEmail = user.email;
        console.log('🔧 TICKET ROUTE DEBUG - Email del usuario encontrado:', userEmail);
      } else {
        console.log('🔧 TICKET ROUTE DEBUG - Usuario no encontrado:', userId);
      }
    }
    
    console.log('🔧 TICKET ROUTE DEBUG - Enviando email de ticket...');
    
    // Enviar el correo de ticket
    const success = await sendTicketEmail(subject, description, userEmail, userId);
    
    console.log('🔧 TICKET ROUTE DEBUG - Resultado del envío:', success);
    
    if (success) {
      return res.status(200).json({ message: 'Ticket enviado correctamente' });
    } else {
      return res.status(500).json({ message: 'Error al enviar el ticket' });
    }
  } catch (error) {
    console.error('🔧 TICKET ROUTE DEBUG - Error en la ruta de ticket:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;

