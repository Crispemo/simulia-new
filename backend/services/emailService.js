const nodemailer = require('nodemailer');

// Verificar si las credenciales de email están configuradas
const hasEmailCredentials = process.env.EMAIL && process.env.EMAIL_PASSWORD;

// Log de diagnóstico para producción
console.log('=== DIAGNÓSTICO EMAIL SERVICE ===');
console.log('EMAIL configurado:', !!process.env.EMAIL);
console.log('EMAIL_PASSWORD configurado:', !!process.env.EMAIL_PASSWORD);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('================================');

// Configura el transporte de correo solo si las credenciales están disponibles
let transporter = null;

if (hasEmailCredentials) {
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true para 465, false para otros puertos
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
    // Configuraciones de timeout más agresivas
    connectionTimeout: 10000, // 10 segundos
    greetingTimeout: 5000,    // 5 segundos
    socketTimeout: 10000,     // 10 segundos
    // Configuraciones adicionales para mejorar la estabilidad
    pool: false,
    maxConnections: 1,
    maxMessages: 1,
    rateLimit: 1,
    // Configuraciones TLS
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3'
    }
  });
  
  // Verificar la configuración de email al inicializar (con timeout)
  const verifyTimeout = setTimeout(() => {
    console.log('⚠️  Timeout en verificación de email, pero el transporter sigue activo');
  }, 10000); // 10 segundos timeout

  transporter.verify((error, success) => {
    clearTimeout(verifyTimeout);
    if (error) {
      console.error('Error en la configuración de email:', error.message);
      // NO deshabilitar el transporter aquí, solo loguear el error
      console.log('⚠️  Advertencia: Error en verificación de email, pero el transporter sigue activo');
    } else {
      console.log('✅ Servicio de email configurado correctamente');
    }
  });
} else {
  console.log('Variables de email no configuradas. Funcionando en modo desarrollo sin email.');
}

// Función para enviar correos personalizados
const sendSubscriptionEmail = async (email, plan, expirationDate) => {
  if (!email || !plan) {
    console.error('Faltan datos para enviar el correo (email o plan).');
    return;
  }

  let subject = 'Confirmación de suscripción';
  let content = 'Gracias por tu suscripción.';

  switch (plan) {
    case 'mensual':
      subject = 'Gracias por elegir el plan mensual';
      content = `
      <h1>Bienvenido a Simulia</h1>
      <p>¡Gracias por suscribirte al plan mensual! Tu suscripción expira el ${expirationDate.toLocaleDateString()}.
      <br>Puedes acceder a todas las funciones de la plataforma durante este período.</p>
      <p>Si tienes alguna pregunta, no dudes en contactarnos a simuliaproject@simulia.es</p>
      `;
      break;
    case 'anual':
      subject = 'Gracias por elegir el plan anual';
      content = `
      <h1>Bienvenido a Simulia</h1>
      <p>¡Gracias por suscribirte al plan anual! Tu suscripción expira el ${expirationDate.toLocaleDateString()}.
      <br>Has elegido la mejor opción para prepararte a fondo.</p>
      <p>Si tienes alguna pregunta, no dudes en contactarnos a simuliaproject@simulia.es</p>
      `;
      break;
    default:
      // No haría falta, pero por si acaso
      subject = 'Confirmación de suscripción a Simulia';
      content = `
      <h1>Bienvenido a Simulia</h1>
      <p>Gracias por suscribirte. Tu cuenta estará activa hasta el ${expirationDate.toLocaleDateString()}.</p>
      <p>Si tienes alguna pregunta, no dudes en contactarnos a simuliaproject@simulia.es</p>
      `;
  }

  // Si no hay transporter configurado, solo loguear
  if (!transporter) {
    console.log('=== EMAIL SIMULADO (Sin configuración de email) ===');
    console.log(`Para: ${email}`);
    console.log(`Asunto: ${subject}`);
    console.log(`Contenido: ${content}`);
    console.log('================================================');
    return true; // Simular éxito
  }

  // Función para reintentar el envío de email
  const sendWithRetry = async (mailOptions, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Correo enviado a ${email} (intento ${attempt})`);
        return true;
      } catch (error) {
        console.error(`❌ Error al enviar correo (intento ${attempt}/${maxRetries}):`, error.message);
        
        // Si es el último intento, devolver false
        if (attempt === maxRetries) {
          console.error(`💥 Falló el envío de correo después de ${maxRetries} intentos`);
          return false;
        }
        
        // Esperar antes del siguiente intento (backoff exponencial)
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
        console.log(`⏳ Esperando ${delay}ms antes del siguiente intento...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return false;
  };

  try {
    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject,
      html: content,
    };
    
    return await sendWithRetry(mailOptions);
  } catch (error) {
    console.error('Error crítico al enviar correo:', error.message);
    return false;
  }
};

// Función para enviar impugnaciones
const sendDisputeEmail = async (question, reason, userAnswer, userEmail, userId, questionId = null, collectionHint = null) => {

  
  if (!question) {
    console.error('❌ ERROR: Faltan datos para enviar la impugnación (pregunta).');
    console.log('═══════════════════════════════════════════════════════');
    return false;
  }
  console.log(question);
  const subject = 'impugnación';
  const message = `
    Se ha recibido una nueva impugnación:
    
    Usuario: ${userId || 'No disponible'}
    Email: ${userEmail || 'No disponible'}
    
    ID de la pregunta: ${questionId || 'No disponible'}${collectionHint ? ` (${collectionHint})` : ''}
    
    Pregunta: ${question}
    
    Respuesta seleccionada: ${(userAnswer && typeof userAnswer === 'object' ? userAnswer.selectedAnswer : userAnswer) || 'No seleccionada'}
    
    Razón de impugnación: ${reason || 'No especificada'}
    
    Fecha: ${new Date().toLocaleString()}
  `;

  

  // Si no hay transporter configurado, solo loguear la impugnación
  if (!transporter) {
  
    return true; // Simular éxito para que el frontend no muestre error
  }

  // Función para reintentar el envío de email de impugnación
  const sendDisputeWithRetry = async (mailOptions, maxRetries = 2) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log('─────────────────────────────────────────────────────');
      console.log(`🔄 INTENTO ${attempt}/${maxRetries} - Enviando email`);
      console.log('─────────────────────────────────────────────────────');
      
      try {
        console.log('🔧 Creando nuevo transporter...');
        console.log('📋 Configuración SMTP:');
        console.log('  - Host: smtp.gmail.com');
        console.log('  - Port: 587');
        console.log('  - Secure: false');
        console.log('  - Auth User:', process.env.EMAIL ? `${process.env.EMAIL.substring(0, 3)}***` : 'NO CONFIGURADO');
        console.log('  - Connection Timeout: 10000ms');
        console.log('  - Greeting Timeout: 5000ms');
        console.log('  - Socket Timeout: 10000ms');
        console.log('  - TLS Min Version: TLSv1.2');
        
        // Crear un nuevo transporter para cada intento para evitar problemas de conexión
        const freshTransporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASSWORD,
          },
          connectionTimeout: 10000, // 10 segundos (aumentado)
          greetingTimeout: 5000,    // 5 segundos (aumentado)
          socketTimeout: 10000,     // 10 segundos (aumentado)
          tls: {
            rejectUnauthorized: false,
            minVersion: 'TLSv1.2'
          },
          debug: true, // Habilitar debug de nodemailer
          logger: true, // Habilitar logger de nodemailer
          pool: false,
          direct: false
        });
        
        console.log('✅ Transporter creado exitosamente');
        console.log('📤 Opciones del email:');
        console.log('  - From:', mailOptions.from);
        console.log('  - To:', mailOptions.to);
        console.log('  - Subject:', mailOptions.subject);
        console.log('  - Text length:', mailOptions.text ? mailOptions.text.length : 0);
        
        console.log('📡 Iniciando envío de email...');
        const startTime = Date.now();
        
        const info = await freshTransporter.sendMail(mailOptions);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log('✅✅✅ ÉXITO: Correo de impugnación enviado');
        console.log('📊 Información del envío:');
        console.log('  - MessageId:', info.messageId);
        console.log('  - Response:', info.response);
        console.log('  - Accepted:', info.accepted);
        console.log('  - Rejected:', info.rejected);
        console.log('  - Duración:', duration, 'ms');
        console.log(`  - Intento: ${attempt}/${maxRetries}`);
        console.log('═══════════════════════════════════════════════════════');
        return true;
      } catch (error) {
        const errorTime = Date.now();
        console.error('❌❌❌ ERROR al enviar correo de impugnación');
        console.error('🔍 DETALLES COMPLETOS DEL ERROR:');
        console.error('  - Intento:', `${attempt}/${maxRetries}`);
        console.error('  - Error Name:', error.name);
        console.error('  - Error Message:', error.message);
        console.error('  - Error Code:', error.code);
        console.error('  - Error Command:', error.command);
        console.error('  - Response Code:', error.responseCode);
        console.error('  - Response:', error.response);
        console.error('  - Timestamp:', new Date(errorTime).toISOString());
        
        // Log del stack trace completo
        if (error.stack) {
          console.error('📚 Stack Trace:');
          console.error(error.stack);
        }
        
        // Log de propiedades adicionales del error
        console.error('🔍 Propiedades del error:');
        console.error('  - All Properties:', Object.keys(error));
        for (const key in error) {
          if (error.hasOwnProperty(key) && !['stack', 'name', 'message'].includes(key)) {
            console.error(`  - ${key}:`, error[key]);
          }
        }
        
        // Si es el último intento, devolver false
        if (attempt === maxRetries) {
          console.error('💥💥💥 FALLO FINAL: Agotados todos los intentos');
          console.error(`  - Total de intentos: ${maxRetries}`);
          console.error('  - Último error:', error.message);
          console.log('═══════════════════════════════════════════════════════');
          return false;
        }
        
        // Esperar menos tiempo entre intentos
        const delay = 1000; // 1 segundo
        console.log(`⏳ Esperando ${delay}ms antes del siguiente intento...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return false;
  };

  try {
    const mailOptions = {
      from: process.env.EMAIL,
      to: 'simuliaproject@simulia.es', // Se envía al correo de impugnaciones
      subject,
      text: message,
    };
    
    console.log('🚀 Iniciando proceso de envío con reintentos...');
    const result = await sendDisputeWithRetry(mailOptions);
    console.log('🏁 Proceso finalizado. Resultado:', result ? 'ÉXITO' : 'FALLO');
    console.log('═══════════════════════════════════════════════════════');
    return result;
  } catch (error) {
    console.error('💥 ERROR CRÍTICO al enviar correo de impugnación');
    console.error('🔍 Detalles del error crítico:');
    console.error('  - Name:', error.name);
    console.error('  - Message:', error.message);
    console.error('  - Stack:', error.stack);
    console.log('═══════════════════════════════════════════════════════');
    return false;
  }
};

// Función para enviar tickets/incidencias
const sendTicketEmail = async (subject, description, userEmail, userId) => {
  if (!description) {
    console.error('❌ ERROR: Faltan datos para enviar el ticket (descripción).');
    console.log('═══════════════════════════════════════════════════════');
    return false;
  }

  const emailSubject = `Ticket/Incidencia: ${subject || 'Sin asunto'}`;
  const message = `
    Se ha recibido un nuevo ticket/incidencia:
    
    Usuario: ${userId || 'No disponible'}
    Email: ${userEmail || 'No disponible'}
    
    Asunto: ${subject || 'Sin asunto'}
    
    Descripción: ${description}
    
    Fecha: ${new Date().toLocaleString()}
  `;

  console.log('🔧 TICKET EMAIL DEBUG - Iniciando envío de ticket');
  console.log('🔧 TICKET EMAIL DEBUG - Subject:', emailSubject);
  console.log('🔧 TICKET EMAIL DEBUG - UserId:', userId);
  console.log('🔧 TICKET EMAIL DEBUG - UserEmail:', userEmail);
  console.log('🔧 TICKET EMAIL DEBUG - Transporter disponible:', !!transporter);
  console.log('🔧 TICKET EMAIL DEBUG - EMAIL configurado:', !!process.env.EMAIL);
  console.log('🔧 TICKET EMAIL DEBUG - EMAIL_PASSWORD configurado:', !!process.env.EMAIL_PASSWORD);

  // Si no hay transporter configurado, solo loguear el ticket
  if (!transporter) {
    console.log('=== TICKET SIMULADO (Sin configuración de email) ===');
    console.log(`Para: simuliaproject@simulia.es`);
    console.log(`Asunto: ${emailSubject}`);
    console.log(`Mensaje: ${message}`);
    console.log('================================================');
    return true; // Simular éxito para que el frontend no muestre error
  }

  // Función para reintentar el envío de email de ticket
  const sendTicketWithRetry = async (mailOptions, maxRetries = 2) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log('─────────────────────────────────────────────────────');
      console.log(`🔄 INTENTO ${attempt}/${maxRetries} - Enviando email de ticket`);
      console.log('─────────────────────────────────────────────────────');
      
      try {
        console.log('🔧 Creando nuevo transporter...');
        console.log('📋 Configuración SMTP:');
        console.log('  - Host: smtp.gmail.com');
        console.log('  - Port: 587');
        console.log('  - Secure: false');
        console.log('  - Auth User:', process.env.EMAIL ? `${process.env.EMAIL.substring(0, 3)}***` : 'NO CONFIGURADO');
        console.log('  - Connection Timeout: 10000ms');
        console.log('  - Greeting Timeout: 5000ms');
        console.log('  - Socket Timeout: 10000ms');
        console.log('  - TLS Min Version: TLSv1.2');
        
        // Crear un nuevo transporter para cada intento para evitar problemas de conexión
        const freshTransporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASSWORD,
          },
          connectionTimeout: 10000, // 10 segundos (aumentado)
          greetingTimeout: 5000,    // 5 segundos (aumentado)
          socketTimeout: 10000,     // 10 segundos (aumentado)
          tls: {
            rejectUnauthorized: false,
            minVersion: 'TLSv1.2'
          },
          debug: true, // Habilitar debug de nodemailer
          logger: true, // Habilitar logger de nodemailer
          pool: false,
          direct: false
        });
        
        console.log('✅ Transporter creado exitosamente');
        console.log('📤 Opciones del email:');
        console.log('  - From:', mailOptions.from);
        console.log('  - To:', mailOptions.to);
        console.log('  - Subject:', mailOptions.subject);
        console.log('  - Text length:', mailOptions.text ? mailOptions.text.length : 0);
        
        console.log('📡 Iniciando envío de email...');
        const startTime = Date.now();
        
        const info = await freshTransporter.sendMail(mailOptions);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log('✅✅✅ ÉXITO: Correo de ticket enviado');
        console.log('📊 Información del envío:');
        console.log('  - MessageId:', info.messageId);
        console.log('  - Response:', info.response);
        console.log('  - Accepted:', info.accepted);
        console.log('  - Rejected:', info.rejected);
        console.log('  - Duración:', duration, 'ms');
        console.log(`  - Intento: ${attempt}/${maxRetries}`);
        console.log('═══════════════════════════════════════════════════════');
        return true;
      } catch (error) {
        const errorTime = Date.now();
        console.error('❌❌❌ ERROR al enviar correo de ticket');
        console.error('🔍 DETALLES COMPLETOS DEL ERROR:');
        console.error('  - Intento:', `${attempt}/${maxRetries}`);
        console.error('  - Error Name:', error.name);
        console.error('  - Error Message:', error.message);
        console.error('  - Error Code:', error.code);
        console.error('  - Error Command:', error.command);
        console.error('  - Response Code:', error.responseCode);
        console.error('  - Response:', error.response);
        console.error('  - Timestamp:', new Date(errorTime).toISOString());
        
        // Log del stack trace completo
        if (error.stack) {
          console.error('📚 Stack Trace:');
          console.error(error.stack);
        }
        
        // Log de propiedades adicionales del error
        console.error('🔍 Propiedades del error:');
        console.error('  - All Properties:', Object.keys(error));
        for (const key in error) {
          if (error.hasOwnProperty(key) && !['stack', 'name', 'message'].includes(key)) {
            console.error(`  - ${key}:`, error[key]);
          }
        }
        
        // Si es el último intento, devolver false
        if (attempt === maxRetries) {
          console.error('💥💥💥 FALLO FINAL: Agotados todos los intentos');
          console.error(`  - Total de intentos: ${maxRetries}`);
          console.error('  - Último error:', error.message);
          console.log('═══════════════════════════════════════════════════════');
          return false;
        }
        
        // Esperar antes del siguiente intento
        const delay = 1000; // 1 segundo
        console.log(`⏳ Esperando ${delay}ms antes del siguiente intento...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return false;
  };

  try {
    const mailOptions = {
      from: process.env.EMAIL,
      to: 'simuliaproject@simulia.es', // Se envía al correo de soporte
      subject: emailSubject,
      text: message,
    };
    
    console.log('🚀 Iniciando proceso de envío de ticket con reintentos...');
    const result = await sendTicketWithRetry(mailOptions);
    console.log('🏁 Proceso finalizado. Resultado:', result ? 'ÉXITO' : 'FALLO');
    console.log('═══════════════════════════════════════════════════════');
    return result;
  } catch (error) {
    console.error('💥 ERROR CRÍTICO al enviar correo de ticket');
    console.error('🔍 Detalles del error crítico:');
    console.error('  - Name:', error.name);
    console.error('  - Message:', error.message);
    console.error('  - Stack:', error.stack);
    console.log('═══════════════════════════════════════════════════════');
    return false;
  }
};

// Función para enviar respuestas de encuesta
const sendSurveyEmail = async (responses, userEmail, userName, userId, timestamp) => {
  if (!responses || Object.keys(responses).length === 0) {
    console.error('❌ ERROR: Faltan datos para enviar la encuesta (respuestas).');
    return false;
  }

  const emailSubject = '📋 Nueva respuesta de encuesta - Simulia';
  
  // Formatear las respuestas de manera legible
  const formatResponse = (response) => {
    if (typeof response === 'object' && response !== null) {
      // Si es un objeto (checkbox con múltiples opciones)
      const selected = Object.entries(response)
        .filter(([key, value]) => value === true && key !== 'other')
        .map(([key]) => key);
      const other = response.other;
      let formatted = selected.join(', ');
      if (other) {
        formatted += formatted ? `, Otro: ${other}` : `Otro: ${other}`;
      }
      return formatted || 'No especificado';
    }
    return String(response || 'No especificado');
  };

  // Mapeo de IDs de preguntas a títulos legibles
  const questionTitles = {
    exam_years: '¿Desde qué año te gustaría que estén disponibles los exámenes EIR?',
    practice_types: '¿Qué tipo de prácticas valoras más?',
    comparison: '¿Te gustaría poder compararte con otros usuarios?',
    test_techniques: '¿Te interesa que Simulia incluya consejos para tipo test?',
    technique_format: '¿En qué formato preferirías aprender técnica tipo test?',
    new_features: '¿Hay alguna funcionalidad o mejora que te gustaría ver?',
    best_worst: '¿Qué parte de Simulia valoras más pero podría mejorar?',
    bugs: '¿Has tenido algún fallo en la plataforma?',
    comments: '¿Algún comentario, sugerencia o idea?',
    recommendation: '¿Recomendarías Simulia a otros opositores?'
  };

  const ratingLabels = {
    1: 'Definitivamente NO',
    2: 'Probablemente no',
    3: 'Tal vez',
    4: 'Probablemente sí',
    5: '¡Claro que sí!'
  };

  let message = `
═══════════════════════════════════════════════════════
📋 NUEVA RESPUESTA DE ENCUESTA - SIMULIA
═══════════════════════════════════════════════════════

👤 Usuario: ${userName || userId || 'Anónimo'}
📧 Email: ${userEmail || 'No disponible'}
🆔 User ID: ${userId || 'No disponible'}
📅 Fecha: ${timestamp ? new Date(timestamp).toLocaleString('es-ES') : new Date().toLocaleString('es-ES')}

───────────────────────────────────────────────────────
📝 RESPUESTAS:
───────────────────────────────────────────────────────
`;

  // Agregar cada respuesta formateada
  Object.entries(responses).forEach(([questionId, response]) => {
    const questionTitle = questionTitles[questionId] || questionId;
    let formattedResponse = formatResponse(response);
    
    // Si es la pregunta de recomendación, agregar el label
    if (questionId === 'recommendation' && ratingLabels[response]) {
      formattedResponse = `${response}/5 - ${ratingLabels[response]}`;
    }
    
    message += `\n${questionTitle}\n→ ${formattedResponse}\n`;
  });

  message += `\n═══════════════════════════════════════════════════════\n`;

  console.log('🔧 SURVEY EMAIL DEBUG - Iniciando envío de encuesta');
  console.log('🔧 SURVEY EMAIL DEBUG - UserId:', userId);
  console.log('🔧 SURVEY EMAIL DEBUG - UserEmail:', userEmail);
  console.log('🔧 SURVEY EMAIL DEBUG - Transporter disponible:', !!transporter);
  console.log('🔧 SURVEY EMAIL DEBUG - Número de respuestas:', Object.keys(responses).length);

  // Si no hay transporter configurado, solo loguear la encuesta
  if (!transporter) {
    console.log('=== ENCUESTA SIMULADA (Sin configuración de email) ===');
    console.log(`Para: simuliaproject@simulia.es`);
    console.log(`Asunto: ${emailSubject}`);
    console.log(`Mensaje:\n${message}`);
    console.log('================================================');
    return true; // Simular éxito
  }

  // Función para reintentar el envío de email de encuesta
  const sendSurveyWithRetry = async (mailOptions, maxRetries = 2) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const freshTransporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASSWORD,
          },
          connectionTimeout: 10000,
          greetingTimeout: 5000,
          socketTimeout: 10000,
          tls: {
            rejectUnauthorized: false,
            minVersion: 'TLSv1.2'
          },
          pool: false,
          direct: false
        });
        
        const info = await freshTransporter.sendMail(mailOptions);
        console.log(`✅ Correo de encuesta enviado (intento ${attempt})`);
        return true;
      } catch (error) {
        console.error(`❌ Error al enviar correo de encuesta (intento ${attempt}/${maxRetries}):`, error.message);
        
        if (attempt === maxRetries) {
          return false;
        }
        
        const delay = 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return false;
  };

  try {
    const mailOptions = {
      from: process.env.EMAIL,
      to: 'simuliaproject@simulia.es',
      subject: emailSubject,
      text: message,
    };
    
    const result = await sendSurveyWithRetry(mailOptions);
    return result;
  } catch (error) {
    console.error('💥 ERROR CRÍTICO al enviar correo de encuesta:', error);
    return false;
  }
};

module.exports = { sendSubscriptionEmail, sendDisputeEmail, sendTicketEmail, sendSurveyEmail };