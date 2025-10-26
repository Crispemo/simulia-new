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
const sendDisputeEmail = async (question, reason, userAnswer, userEmail, userId) => {
  console.log('═══════════════════════════════════════════════════════');
  console.log('📧 INICIO ENVÍO IMPUGNACIÓN - LOGS DETALLADOS');
  console.log('═══════════════════════════════════════════════════════');
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
  console.log('📍 Platform:', process.platform);
  console.log('🔧 Node Version:', process.version);
  
  if (!question) {
    console.error('❌ ERROR: Faltan datos para enviar la impugnación (pregunta).');
    console.log('═══════════════════════════════════════════════════════');
    return false;
  }

  const subject = 'impugnación';
  const message = `
    Se ha recibido una nueva impugnación:
    
    Usuario: ${userId || 'No disponible'}
    Email: ${userEmail || 'No disponible'}
    
    Pregunta: ${question}
    
    Respuesta seleccionada: ${userAnswer || 'No seleccionada'}
    
    Razón de impugnación: ${reason || 'No especificada'}
    
    Fecha: ${new Date().toLocaleString()}
  `;

  // Logs detallados de configuración
  console.log('📋 CONFIGURACIÓN DE EMAIL:');
  console.log('  - EMAIL existe:', !!process.env.EMAIL);
  console.log('  - EMAIL value:', process.env.EMAIL ? `${process.env.EMAIL.substring(0, 3)}***` : 'NO CONFIGURADO');
  console.log('  - EMAIL_PASSWORD existe:', !!process.env.EMAIL_PASSWORD);
  console.log('  - EMAIL_PASSWORD length:', process.env.EMAIL_PASSWORD ? process.env.EMAIL_PASSWORD.length : 0);
  console.log('  - Transporter inicializado:', !!transporter);

  // Si no hay transporter configurado, solo loguear la impugnación
  if (!transporter) {
    console.log('⚠️  ADVERTENCIA: No hay transporter configurado');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📝 IMPUGNACIÓN RECIBIDA (Sin configuración de email)');
    console.log('═══════════════════════════════════════════════════════');
    console.log('⚠️  PROBLEMA: Las credenciales de email no están configuradas en producción');
    console.log(`👤 Usuario ID: ${userId || 'No disponible'}`);
    console.log(`📧 Email: ${userEmail || 'No disponible'}`);
    console.log(`❓ Pregunta: ${question.substring(0, 100)}...`);
    console.log(`✍️  Respuesta seleccionada: ${userAnswer || 'No seleccionada'}`);
    console.log(`💭 Razón: ${reason || 'No especificada'}`);
    console.log(`📅 Fecha: ${new Date().toLocaleString()}`);
    console.log('═══════════════════════════════════════════════════════');
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

module.exports = { sendSubscriptionEmail, sendDisputeEmail };