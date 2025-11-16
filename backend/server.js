require('dotenv').config();

// Verificar carga de variables de entorno
console.log('=== VERIFICACIÓN DE VARIABLES DE ENTORNO ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('EMAIL configurado:', !!process.env.EMAIL);
console.log('EMAIL_PASSWORD configurado:', !!process.env.EMAIL_PASSWORD);
console.log('MONGODB_URI configurado:', !!process.env.MONGODB_URI);
console.log('EMAIL valor:', process.env.EMAIL || 'NO CONFIGURADO');
console.log('==========================================');

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET);
const User = require('./models/User');
const Exam = require('./models/Exam');
const ExamenResultado = require('./models/ExamenResultado');
const { ExamenCompleto, ExamenFotos } = require('./models/Pregunta');
const UnansweredQuestion = require('./models/UnansweredQuestion');
const EventLog = require('./models/EventLog');
const EmailLog = require('./models/EmailLog');
const path = require('path');
const disputeRoutes = require('./routes/disputeRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const practiceRoutes = require('./routes/practiceRoutes');
const axios = require('axios');
const OpenAI = require('openai');
const app = express();

// Inicializar OpenAI
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Configuración de URLs para desarrollo y producción
const FRONTEND_URL = process.env.NODE_ENV === 'production' 
  ? 'https://www.simulia.es' 
  : (process.env.FRONTEND_URL || 'http://localhost:3000');
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';
const isProduction = process.env.NODE_ENV === 'production';

// Función para enviar webhook a n8n con verificación de duplicados
async function sendWebhookToN8N(userData) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.log('⚠️ N8N_WEBHOOK_URL no configurada, omitiendo envío de webhook');
    return { success: false, reason: 'webhook_url_not_configured' };
  }

  console.log('🚀 WEBHOOK N8N: Iniciando envío...');
  console.log('📊 WEBHOOK N8N: Datos del usuario:', JSON.stringify(userData, null, 2));
  console.log('🌐 WEBHOOK N8N: URL destino:', webhookUrl);

  // VERIFICACIÓN DE DUPLICADOS - Evitar enviar correos repetidos
  const emailKey = `${userData.email}_${userData.plan}_${userData.sessionId || userData.stripeId || 'unknown'}`;
  console.log('🔑 WEBHOOK N8N: Clave de duplicados:', emailKey);
  
  try {
    const lastEmailSent = await EmailLog.findOne({ 
      emailKey,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Últimas 24 horas
    });
    
    if (lastEmailSent) {
      console.log(`⚠️ WEBHOOK N8N: Email ya enviado a ${userData.email} en las últimas 24h, omitiendo...`);
      return { success: true, reason: 'email_already_sent_recently' };
    }
  } catch (error) {
    console.log('⚠️ WEBHOOK N8N: Error verificando duplicados, continuando...', error.message);
  }

  const webhookData = {
    email: userData.email,
    nombre: userData.nombre || userData.userId || userData.email,
    plan: userData.plan,
    stripeId: userData.stripeId || undefined,
    fechaRegistro: userData.fechaRegistro || new Date().toISOString(),
    timestamp: new Date().toISOString(),
    source: 'simulia-backend',
    sessionId: userData.sessionId || undefined
  };

  try {
    console.log('🚀 WEBHOOK N8N: Enviando a:', webhookUrl);
    console.log('📊 WEBHOOK N8N: Datos enviados:', JSON.stringify(webhookData, null, 2));
    
    const response = await axios.post(webhookUrl, webhookData, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Simulia-Backend/1.0'
      },
      timeout: 15000 // 15 segundos de timeout
    });

    console.log('✅ WEBHOOK N8N: Enviado exitosamente');
    console.log('📈 WEBHOOK N8N: Status:', response.status, response.statusText);
    console.log('📊 WEBHOOK N8N: Respuesta:', response.data);
    
    // Registrar el correo enviado exitosamente
    try {
      await EmailLog.create({
        emailKey,
        email: userData.email,
        plan: userData.plan,
        sessionId: userData.sessionId,
        stripeId: userData.stripeId,
        status: 'sent',
        webhookResponse: response.data
      });
      console.log('💾 WEBHOOK N8N: Email registrado en base de datos');
    } catch (dbError) {
      console.log('⚠️ WEBHOOK N8N: Error registrando email en BD:', dbError.message);
    }
    
    return { 
      success: true, 
      status: response.status,
      data: response.data 
    };
  } catch (error) {
    console.error('❌ WEBHOOK N8N: Error al enviar:', error.message);
    
    if (error.response) {
      console.error('📊 WEBHOOK N8N: Status error:', error.response.status);
      console.error('📊 WEBHOOK N8N: Data error:', error.response.data);
      console.error('📊 WEBHOOK N8N: Headers error:', error.response.headers);
      return { 
        success: false, 
        error: error.message,
        status: error.response.status,
        data: error.response.data 
      };
    } else if (error.request) {
      console.error('📊 WEBHOOK N8N: Sin respuesta (timeout o conectividad)');
      console.error('📊 WEBHOOK N8N: Request details:', error.request);
      return { 
        success: false, 
        error: 'No response from webhook',
        timeout: true 
      };
    } else {
      console.error('📊 WEBHOOK N8N: Error de configuración:', error.message);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
}

// Middleware Configuration - CONFIGURAR RAW BODY PARA STRIPE WEBHOOK PRIMERO
app.use('/stripe-webhook', express.raw({ type: 'application/json' }));

// Para todas las demás rutas, usar JSON parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// CORS seguro con credenciales y whitelist
const corsWhitelist = [
  'http://localhost:3000',
  'https://www.simulia.es',
  'https://simulia.es',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && corsWhitelist.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  }
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  // Responder preflight rápidamente
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(cors({
  origin: function (origin, callback) {
    // Permitir herramientas sin origin (Postman/cURL) y orígenes en whitelist
    if (!origin || corsWhitelist.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Asegurar manejo de OPTIONS en todas las rutas
app.options('*', cors());

// Registrar las rutas de impugnaciones
app.use(disputeRoutes);
// Registrar las rutas de tickets/incidencias
app.use(ticketRoutes);
// Rutas de práctica y preferencias
app.use(practiceRoutes);

// Ruta para el asistente de IA con ChatGPT
app.post('/ai-assistant/chat', async (req, res) => {
  try {
    const { message, messages } = req.body;

    if (!message && (!messages || messages.length === 0)) {
      return res.status(400).json({ error: 'Mensaje requerido' });
    }

    // Verificar si OpenAI está configurado
    if (!openai || !process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OpenAI no configurado, usando respuesta por defecto');
      return res.status(503).json({ 
        error: 'Servicio de IA no disponible',
        fallback: true 
      });
    }

    // Preparar el historial de mensajes para ChatGPT
    let systemPrompt = `Eres un ASISTENTE GUÍA EXPERTO especializado en ayudar a estudiantes de enfermería a prepararse para el Examen de Enfermero Interno Residente (EIR) en la plataforma Simulia.

Tu rol es ser un GUÍA PROACTIVO que:
1. ANALIZA los datos del estudiante para entender su situación real
2. IDENTIFICA áreas de mejora basándose en métricas concretas
3. PROPORCIONA recomendaciones específicas y accionables
4. SUGIERE planes de estudio personalizados según el rendimiento
5. MOTIVA pero también es honesto sobre las áreas que necesitan trabajo

ESTRUCTURA DE TUS RESPUESTAS:
- 📊 Análisis: Resume brevemente la situación del estudiante
- 🎯 Recomendación: Propón acciones concretas y específicas
- 📝 Plan de acción: Indica pasos claros y realizables
- 💡 Consejo práctico: Añade un tip útil relacionado

FORMATO:
- Usa emojis para hacer la información más visual (📊 📈 ⚠️ ✅ 💡 🎯)
- Estructura con párrafos cortos y listas cuando sea apropiado
- Sé específico: menciona números, porcentajes, asignaturas concretas
- Mantén un tono profesional pero cercano y motivador
- Máximo 250 palabras por respuesta

IMPORTANTE:
- SIEMPRE analiza los datos del usuario si están disponibles
- No des respuestas genéricas cuando tengas datos específicos
- Si el usuario pregunta sobre una asignatura, usa los datos de esa asignatura
- Sé proactivo: anticipa necesidades y sugiere mejoras
- NO inventes información que no tengas certeza`;

    // Si hay contexto adicional del usuario en el mensaje, agregarlo al system prompt
    if (req.body.userContext) {
      systemPrompt += `\n\n${req.body.userContext}`;
    }

    let conversationMessages = [
      { role: 'system', content: systemPrompt }
    ];

    // Si hay historial de mensajes, convertirlo al formato de OpenAI
    if (messages && Array.isArray(messages) && messages.length > 0) {
      messages.forEach(msg => {
        if (msg.sender === 'user') {
          conversationMessages.push({ role: 'user', content: msg.text });
        } else if (msg.sender === 'bot') {
          conversationMessages.push({ role: 'assistant', content: msg.text });
        }
      });
    }

    // Agregar el nuevo mensaje del usuario
    if (message) {
      conversationMessages.push({ role: 'user', content: message });
    }

    console.log(`🤖 ChatGPT: Procesando mensaje (historial: ${conversationMessages.length - 1} mensajes)`);

    // Llamar a la API de OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Modelo más económico y rápido
      messages: conversationMessages,
      temperature: 0.7,
      max_tokens: 300,
    });

    const aiResponse = completion.choices[0]?.message?.content || 'Lo siento, no pude generar una respuesta.';

    console.log(`✅ ChatGPT: Respuesta generada (${aiResponse.length} caracteres)`);

    res.json({
      response: aiResponse,
      model: 'gpt-4o-mini'
    });

  } catch (error) {
    console.error('❌ Error en ChatGPT:', error.message);
    
    // Si hay error de rate limit o cuota, devolver un error específico
    if (error.status === 429 || error.code === 'insufficient_quota') {
      return res.status(503).json({ 
        error: 'Límite de uso alcanzado. Inténtalo más tarde.',
        fallback: true
      });
    }

    res.status(500).json({ 
      error: 'Error al procesar la solicitud',
      message: error.message,
      fallback: true
    });
  }
});

// Ruta de diagnóstico para verificar configuración de email
app.get('/debug-email-config', (req, res) => {
  const emailConfigured = !!process.env.EMAIL;
  const passwordConfigured = !!process.env.EMAIL_PASSWORD;
  const nodeEnv = process.env.NODE_ENV;
  
  res.json({
    nodeEnv,
    emailConfigured,
    passwordConfigured,
    emailValue: process.env.EMAIL || 'NO CONFIGURADO',
    passwordValue: process.env.EMAIL_PASSWORD ? 'CONFIGURADO' : 'NO CONFIGURADO',
    timestamp: new Date().toISOString()
  });
});

// Ruta de prueba para enviar impugnación de diagnóstico
app.post('/test-dispute', async (req, res) => {
  try {
    const { sendDisputeEmail } = require('./services/emailService');
    
    const result = await sendDisputeEmail(
      'Pregunta de prueba desde Railway',
      'Esta es una prueba de diagnóstico desde producción',
      'Respuesta A',
      'test@example.com',
      'test-user-railway'
    );
    
    res.json({
      success: result,
      message: result ? 'Impugnación enviada correctamente' : 'Error al enviar impugnación',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Ruta de respaldo para /send-dispute en caso de que la importación de rutas falle
app.post('/send-dispute', async (req, res) => {
  try {
    const { question, reason, userAnswer, userId } = req.body;
    
    if (!question) {
      return res.status(400).json({ message: 'La pregunta es obligatoria' });
    }
    
    // Importar directamente el servicio de email para evitar problemas de rutas
    const { sendDisputeEmail } = require('./services/emailService');
    
    // Obtener email del usuario si se proporciona el userId
    let userEmail = null;
    if (userId) {
      const user = await User.findOne({ userId });
      if (user) {
        userEmail = user.email;
      }
    }
    
    // Enviar el correo de impugnación
    const success = await sendDisputeEmail(question, reason, userAnswer, userEmail, userId);
    
    if (success) {
      return res.status(200).json({ message: 'Impugnación enviada correctamente' });
    } else {
      return res.status(500).json({ message: 'Error al enviar la impugnación' });
    }
  } catch (error) {
    console.error('Error en la ruta directa de impugnación:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Añadir un middleware para debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Middleware para logging de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Conectar a MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/simuliadb';
console.log('Conectando a MongoDB:', MONGODB_URI);

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB connection established');
    console.log('MongoDB connection successful');
    
    // Obtener y mostrar el número de preguntas en cada colección
    Promise.all([
      mongoose.connection.db.collection('examen_completos').countDocuments(),
      mongoose.connection.db.collection('examen_fotos').countDocuments(),
      mongoose.connection.db.collection('examen_protocolos').countDocuments()
    ])
    .then(([completosCount, fotosCount, protocolosCount]) => {
      console.log('=== ESTADÍSTICAS DE PREGUNTAS ===');
      console.log(`Preguntas en examen_completos: ${completosCount}`);
      console.log(`Preguntas en examen_fotos: ${fotosCount}`);
      console.log(`Preguntas en examen_protocolos: ${protocolosCount}`);
      console.log('=================================');
    })
    .catch(err => {
      console.error('Error al obtener estadísticas:', err);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Email Configuration - Se maneja en emailService.js

// User Routes
app.post('/users/check-subscription', async (req, res) => {
  const { userId, email, stripeId } = req.body || {};
  if (!userId && !email && !stripeId) {
    return res.status(400).json({ error: 'Se requiere userId, email o stripeId.' });
  }

  try {
    console.log(`Verificando suscripción para userId: ${userId} | email: ${email} | stripeId: ${stripeId}`);

    let user = null;
    if (userId) user = await User.findOne({ userId });

    // Buscar por email si no se encontró por userId
    if (!user && email) user = await User.findOne({ email: String(email).toLowerCase() });

    // Buscar por stripeId como último recurso
    if (!user && stripeId) user = await User.findOne({ stripeId });
    
    if (!user) {
      console.log('Usuario no encontrado por ninguno de los identificadores');
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    
    // Si vino userId (Firebase uid) y el documento está creado con email, enlazar
    if (userId && user.userId !== userId) {
      console.log(`Vinculando uid de Firebase al usuario existente. Antes: ${user.userId} → Ahora: ${userId}`);
      user.userId = userId;
      await user.save();
    }

    const activePlans = new Set(['mensual', 'anual']);
    const hasSubscription = user.plan && activePlans.has(user.plan);
    console.log(`Usuario ${user.userId} tiene suscripción: ${hasSubscription}, plan: ${user.plan || 'null'}`);
    
    res.json({ 
      hasSubscription,
      subscriptionActive: hasSubscription,
      plan: user.plan,
      user: { userId: user.userId, email: user.email, userName: user.userName }
    });
  } catch (error) {
    console.error('Error al verificar suscripción:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

app.post('/users/check-user-exists', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'El campo userId es obligatorio.' });
  try {
    const userExists = await User.exists({ userId });
    res.json({ exists: !!userExists });
  } catch (error) {
    console.error('Error al verificar usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

app.post('/users/register-user', async (req, res) => {
  const { userId, email, plan } = req.body;
  console.log(`🆕 REGISTRO USUARIO: Solicitud para ${userId}, plan: ${plan}, email: ${email}`);
  
  if (!userId) {
    console.error('❌ REGISTRO USUARIO: Falta campo obligatorio userId:', { userId });
    return res.status(400).json({ error: 'El campo userId es obligatorio.' });
  }
  
  // Validar que el plan sea válido si se proporciona
  if (plan && !['mensual', 'anual'].includes(plan)) {
    console.error('❌ REGISTRO USUARIO: Plan inválido:', { plan });
    return res.status(400).json({ error: 'El plan debe ser "mensual" o "anual".' });
  }
  
  try {
    // Primero verificar si el usuario ya existe por userId
    let existingUser = await User.findOne({ userId });
    // Si no existe por userId, buscar por email y vincular uid
    if (!existingUser && email) {
      existingUser = await User.findOne({ email: String(email).toLowerCase() });
      if (existingUser) {
        console.log(`🔄 REGISTRO USUARIO: Vinculando uid ${userId} a usuario existente con email ${existingUser.email}`);
        existingUser.userId = userId;
      }
    }
    
    if (existingUser) {
      console.log(`🔄 REGISTRO USUARIO: Usuario ${userId} ya existe, actualizando información`);
      
      // Actualizar usuario existente
      existingUser.email = email || existingUser.email;
      if (plan) {
        existingUser.plan = plan;
      }
      
      await existingUser.save();
      console.log(`✅ REGISTRO USUARIO: Usuario ${userId} actualizado con éxito`);
      
      // IMPORTANTE: Enviar webhook incluso para usuarios existentes que cambian de plan
      console.log('🔄 REGISTRO USUARIO: Usuario existente - Enviando webhook por cambio de plan');
      const webhookResult = await sendWebhookToN8N({
        email: existingUser.email,
        nombre: existingUser.userId,
        plan: existingUser.plan,
        userId: existingUser.userId,
        fechaRegistro: new Date().toISOString(),
        reason: 'plan_upgrade'
      });
      
      console.log('🔄 REGISTRO USUARIO: Resultado webhook n8n:', webhookResult.success ? 'enviado' : 'falló');
      if (!webhookResult.success) {
        console.error('🔄 REGISTRO USUARIO: Error en webhook:', webhookResult.error);
      }
      
      return res.json({ 
        message: 'Usuario actualizado con éxito.',
        status: 'updated',
        webhookSent: webhookResult.success,
        reason: 'existing_user_plan_upgrade'
      });
    } else {
      console.log(`🆕 REGISTRO USUARIO: Creando nuevo usuario: ${userId}, plan: ${plan}`);
      
      // Crear nuevo usuario
      const newUser = new User({
        userId,
        email: email || userId,
        plan: plan || null, // Solo asignar plan si es válido, sino null
        examHistory: [], // Inicializar array vacío para examHistory
        failedQuestions: [] // Inicializar array vacío para preguntas falladas
      });
      
      await newUser.save();
      console.log(`✅ REGISTRO USUARIO: Usuario ${userId} registrado con éxito`);
      
      // Solo enviar webhook si el plan es válido (mensual o anual)
      let webhookResult = { success: false };
      if (newUser.plan && ['mensual', 'anual'].includes(newUser.plan)) {
        console.log('🆕 REGISTRO USUARIO: Enviando webhook de bienvenida a n8n');
        webhookResult = await sendWebhookToN8N({
          email: newUser.email,
          nombre: newUser.userId,
          plan: newUser.plan,
          userId: newUser.userId,
          fechaRegistro: new Date().toISOString(),
          reason: 'new_user_welcome'
        });
        
        console.log('🆕 REGISTRO USUARIO: Resultado webhook n8n:', webhookResult.success ? 'enviado' : 'falló');
        if (!webhookResult.success) {
          console.error('🆕 REGISTRO USUARIO: Error en webhook:', webhookResult.error);
        }
      } else {
        console.log('⚠️ REGISTRO USUARIO: No se envía webhook - plan inválido o null:', newUser.plan);
      }
      
      return res.json({ 
        message: 'Usuario registrado con éxito.', 
        status: 'created',
        webhookSent: webhookResult.success,
        reason: 'new_user_welcome'
      });
    }
  } catch (error) {
    console.error('❌ REGISTRO USUARIO: Error al registrar/actualizar usuario:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor.',
      details: error.message 
    });
  }
});

// ===== WEBHOOK ENDPOINTS =====

// Endpoint para el webhook de registro completo (n8n)
app.post('/webhook/registro-completo', async (req, res) => {
  try {
    const { email, plan, nombre, userId, stripeId } = req.body;
    
    console.log('📨 Webhook /registro-completo activado con datos:', JSON.stringify(req.body, null, 2));
    
    // Validar datos requeridos
    if (!email || !plan) {
      console.error('❌ Faltan campos obligatorios en webhook:', { email, plan });
      return res.status(400).json({ 
        error: 'Los campos email y plan son obligatorios' 
      });
    }
    
    // Enviar webhook a n8n
    const webhookResult = await sendWebhookToN8N({
      email,
      nombre: nombre || email,
      plan,
      userId,
      stripeId,
      fechaRegistro: new Date().toISOString()
    });
    
    if (webhookResult.success) {
      console.log('✅ Webhook procesado exitosamente para:', email);
      res.json({ 
        success: true, 
        message: 'Webhook enviado a n8n exitosamente',
        webhookResult 
      });
    } else {
      console.log('⚠️ Webhook procesado con advertencias para:', email);
      res.json({ 
        success: true, 
        message: 'Webhook procesado con advertencias',
        webhookResult,
        warning: 'El webhook no pudo enviarse a n8n pero el registro se completó'
      });
    }
    
  } catch (error) {
    console.error('❌ Error en webhook /registro-completo:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
});

// Endpoint de test para verificar el webhook
app.get('/webhook/test', async (req, res) => {
  try {
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    
    res.json({
      status: 'webhook endpoint operational',
      webhookConfigured: !!webhookUrl,
      webhookUrl: webhookUrl ? `${webhookUrl.substring(0, 30)}...` : 'not configured',
      timestamp: new Date().toISOString(),
      endpoints: {
        register: '/webhook/registro-completo (POST)',
        test: '/webhook/test (GET)'
      }
    });
  } catch (error) {
    console.error('Error en webhook test:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta de prueba para verificar que el servidor está funcionando
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 5001,
    mongoConnected: mongoose.connection.readyState === 1
  });
});

// Question Routes
app.post('/random-questions', async (req, res) => {
  console.log('🔵 RUTA /random-questions LLAMADA');
  console.log('🔵 Método:', req.method);
  console.log('🔵 URL:', req.url);
  console.log('🔵 Body recibido:', JSON.stringify(req.body, null, 2));
  
  try {
    const { numPreguntas, asignaturas, examType, count } = req.body;
    console.log(`=== SOLICITUD EXAMEN ===`);
    console.log(`Tipo de examen: ${examType}`);
    console.log(`Número de preguntas solicitadas (numPreguntas): ${numPreguntas}`);
    console.log(`Número de preguntas solicitadas (count): ${count}`);
    console.log(`Asignaturas seleccionadas: ${asignaturas?.join(', ')}`);

    // Si el tipo de examen es protocolos, obtener preguntas de la colección examen_protocolos
    if (examType === 'protocolos') {
      console.log("Obteniendo preguntas de protocolos...");
      
      try {
        // Verificar conexión a MongoDB
        if (!mongoose.connection.readyState) {
          console.error('❌ MongoDB no está conectado');
          return res.status(500).json({ 
            error: 'Error de conexión a la base de datos',
            message: 'MongoDB no está conectado. Estado: ' + mongoose.connection.readyState
          });
        }
        
        console.log('✅ MongoDB conectado. Estado:', mongoose.connection.readyState);
        console.log('✅ Base de datos:', mongoose.connection.db?.databaseName);
        
        // Verificar que la colección existe
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        console.log('📋 Colecciones disponibles:', collectionNames);
        
        if (!collectionNames.includes('examen_protocolos')) {
          console.warn('⚠️ La colección examen_protocolos no existe');
          return res.status(404).json({ 
            error: 'Colección no encontrada',
            message: 'La colección examen_protocolos no existe en la base de datos',
            availableCollections: collectionNames
          });
        }
        
        // Aceptar tanto 'count' como 'numPreguntas' para compatibilidad
        const requestedCount = parseInt(req.body.count || numPreguntas || 30);
        console.log(`Solicitando ${requestedCount} preguntas de protocolos`);
        
        // Contar documentos en la colección
        const totalCount = await mongoose.connection.db
          .collection('examen_protocolos')
          .countDocuments();
        console.log(`📊 Total de documentos en examen_protocolos: ${totalCount}`);
        
        if (totalCount === 0) {
          console.warn('⚠️ La colección examen_protocolos está vacía');
          return res.status(404).json({ 
            error: 'Colección vacía',
            message: 'La colección examen_protocolos existe pero está vacía',
            totalDocuments: 0
          });
        }
        
        const preguntasProtocolos = await mongoose.connection.db
          .collection('examen_protocolos')
          .aggregate([{ $sample: { size: Math.min(requestedCount, totalCount) } }])
          .toArray();
        
        console.log(`Encontradas ${preguntasProtocolos.length} preguntas de protocolo`);
        
        if (preguntasProtocolos.length === 0) {
          console.warn('⚠️ No se pudieron obtener preguntas de la colección examen_protocolos');
          return res.status(404).json({ 
            error: 'No se encontraron preguntas de protocolos en la base de datos',
            message: 'La colección examen_protocolos está vacía o no existe',
            totalDocuments: totalCount
          });
        }
        
        const processedQuestions = preguntasProtocolos.map(q => ({
          _id: q._id,
          question: q.question || '',
          option_1: q.option_1 || '',
          option_2: q.option_2 || '',
          option_3: q.option_3 || '',
          option_4: q.option_4 || '',
          option_5: q.option_5 || '', // Incluir option_5 si existe
          answer: q.answer || '',
          subject: q.subject || 'General',
          long_answer: q.long_answer || '', // Incluir long_answer si existe
          image: q.image || null
        }));
        
        console.log(`Enviando ${processedQuestions.length} preguntas de protocolos procesadas`);
        return res.json(processedQuestions);
      } catch (error) {
        console.error('Error al obtener preguntas de protocolos:', error);
        return res.status(500).json({ 
          error: 'Error al obtener preguntas de protocolos',
          message: error.message 
        });
      }
    }

    // Continuar con el código existente para otros tipos de exámenes
    // Construir query base con subject específicos
    const baseQuery = asignaturas && asignaturas.length > 0 
      ? { subject: { $in: asignaturas } }
      : {};

    // Obtener todas las preguntas con imágenes
    const imageQuestions = await mongoose.connection.db
      .collection('examen_completos')
      .find({ ...baseQuery, image: { $exists: true, $ne: null } })
      .toArray();

    console.log(`Total de preguntas con imágenes disponibles: ${imageQuestions.length}`);

    // Obtener preguntas sin imágenes
    const textQuestions = await mongoose.connection.db
      .collection('examen_completos')
      .find({ ...baseQuery, $or: [{ image: { $exists: false } }, { image: null }] })
      .toArray();

    console.log(`Total de preguntas sin imágenes disponibles: ${textQuestions.length}`);

    // Determinar el número de preguntas con imágenes a incluir
    const numImageQuestions = Math.min(imageQuestions.length, 10); // Máximo 10 preguntas con imágenes
    const numTextQuestions = Math.min(
      textQuestions.length,
      (parseInt(numPreguntas) || 210) - numImageQuestions
    );

    // Mezclar aleatoriamente las preguntas
    const shuffleArray = (array) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };

    // Seleccionar aleatoriamente preguntas con imágenes
    const selectedImageQuestions = shuffleArray([...imageQuestions])
      .slice(0, numImageQuestions);

    // Seleccionar aleatoriamente preguntas sin imágenes
    const selectedTextQuestions = shuffleArray([...textQuestions])
      .slice(0, numTextQuestions);

    // Combinar y mezclar todas las preguntas seleccionadas
    const allQuestions = shuffleArray([...selectedImageQuestions, ...selectedTextQuestions]);

    // Procesar preguntas
    const processedQuestions = allQuestions.map(q => ({
      _id: q._id,
      question: q.question,
      option_1: q.option_1,
      option_2: q.option_2,
      option_3: q.option_3,
      option_4: q.option_4,
      option_5: q.option_5 || "-",
      answer: q.answer,
      exam_name: q.exam_name,
      subject: q.subject,
      long_answer: q.long_answer,
      image: q.image ? q.image : null
    }));

    console.log(`Enviando ${processedQuestions.length} preguntas totales`);
    console.log(`De las cuales ${selectedImageQuestions.length} tienen imágenes`);

    return res.json(processedQuestions);

  } catch (error) {
    console.error('Error en /random-questions:', error);
    return res.status(500).json({ error: 'Error al obtener preguntas' });
  }
});

// Endpoint GET para obtener preguntas aleatorias para la página principal - DESHABILITADO
// app.get('/random-questions', async (req, res) => {
//   try {
//     console.log('Obteniendo preguntas aleatorias para mostrar en la página principal');
//     
//     // Obtener entre 3-5 preguntas aleatorias para mostrar
//     const sampleSize = 4;
//     
//     // Obtener preguntas aleatorias de la colección principal
//     const questions = await ExamenCompleto.aggregate([
//       { $match: { 
//         $or: [
//           { image: { $exists: false } }, 
//           { image: null }
//         ]
//       }}, // Solo preguntas sin imagen para la página principal
//       { $sample: { size: sampleSize } },
//       { $project: { 
//         _id: 1,
//         question: 1, 
//         option_1: 1, 
//         option_2: 1, 
//         option_3: 1, 
//         option_4: 1, 
//         option_5: 1,
//         answer: q.answer || '',
//         subject: q.subject || 'General',
//         exam_name: q.exam_name || ''
//       }}
//     ];
//     
//     if (questions.length === 0) {
//       console.log('No se encontraron preguntas para mostrar');
//       return res.json([]);
//     }
//     
//     // Procesar las preguntas para el formato esperado
//     const processedQuestions = questions.map(q => ({
//       _id: q._id,
//       question: q.question || '',
//       option_1: q.option_1 || '',
//       option_2: q.option_2 || '',
//       option_3: q.option_3 || '',
//       option_4: q.option_4 || '',
//       option_5: q.option_5 || '',
//       answer: q.answer || '',
//       subject: q.subject || 'General',
//       exam_name: q.exam_name || ''
//     }));
//     
//     console.log(`Enviando ${processedQuestions.length} preguntas de muestra para la página principal`);
//     res.json(processedQuestions);
//     
//   } catch (error) {
//     console.error('Error al obtener preguntas aleatorias para la página principal:', error);
//     res.status(500).json({ error: 'Error al obtener preguntas aleatorias' });
//   }
// });

// Middleware para verificar que el usuario existe
const verifyUser = async (req, res, next) => {
  // Obtener userId de los parámetros o del cuerpo de la petición
  const userId = req.params.userId || req.body.userId;

  if (!userId) {
    return res.status(400).json({ error: 'userId es requerido' });
  }

  try {
    // Verificar que el usuario existe en la base de datos
    const user = await User.findOne({ userId });

    if (!user) {
      console.error(`Usuario no encontrado: ${userId}`);
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Añadir el usuario a la petición para que esté disponible en las rutas
    req.user = user;
    next();
  } catch (error) {
    console.error(`Error al verificar usuario ${userId}:`, error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Middleware para verificar que el usuario tiene una suscripción activa
const verifySubscription = async (req, res, next) => {
  const user = req.user;

  if (!user) {
    return res.status(500).json({ error: 'Usuario no disponible en el middleware' });
  }

  try {
    // La suscripción es válida si el usuario tiene un plan activo (mensual o anual)
    const activePlans = new Set(['mensual', 'anual']);
    const hasSubscription = user.plan && activePlans.has(user.plan);

    if (!hasSubscription) {
      console.log(`Usuario ${user.userId} intenta acceder sin suscripción activa`);
      return res.status(403).json({ error: 'Se requiere una suscripción activa para acceder a esta funcionalidad' });
    }

    next();
  } catch (error) {
    console.error(`Error al verificar suscripción para ${user.userId}:`, error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};


app.get('/protocol-questions', async (req, res) => {
  try {
    console.log("Iniciando solicitud de preguntas de protocolo");
    
    // Verificar la estructura de los documentos en examen_protocolos
    const sampleProtocol = await mongoose.connection.db.collection('examen_protocolos').findOne();
    console.log("Ejemplo de documento en examen_protocolos:", JSON.stringify(sampleProtocol, null, 2));
    
    const preguntasProtocolos = await mongoose.connection.db.collection('examen_protocolos')
      .aggregate([{ $sample: { size: 30 } }])
      .toArray();
    
    console.log(`Encontradas ${preguntasProtocolos.length} preguntas de protocolo`);
    
    const processed = preguntasProtocolos.map(q => ({
      _id: q._id,
      question: q.question || '',
      option_1: q.option_1 || '',
      option_2: q.option_2 || '',
      option_3: q.option_3 || '',
      option_4: q.option_4 || '',
      options: [q.option_1, q.option_2, q.option_3, q.option_4].filter(Boolean),
      answer: q.answer || '',
      long_answer: q.long_answer || '' // Incluir long_answer si existe
    }));
    
    return res.json(processed);
  } catch (error) {
    console.error('Error al obtener preguntas de protocolos:', error);
    return res.status(500).json({ error: 'Error al obtener preguntas de protocolos' });
  }
});

app.get('/get-exam-progress/:userId', async (req, res) => {
  const { userId } = req.params;
  
  // Verificar que el userId no esté vacío
  if (!userId) {
    console.error('Error: userId es requerido');
    return res.status(400).json({ error: 'userId es requerido' });
  }

  console.log(`Buscando progreso para usuario: ${userId}`);
  
  try {
    // Si el userId es 'exampleUserId', manejar como un caso especial
    if (userId === 'exampleUserId') {
      console.log('Usuario de ejemplo detectado, retornando progreso vacío');
      return res.json({ progress: null });
    }

    // Buscar usuario
    const user = await User.findOne({ userId });
    
    if (!user) {
      console.log(`Usuario ${userId} no encontrado`);
      
      // Si es test_user_1, intentar crearlo automáticamente
      if (userId === 'test_user_1') {
        console.log('Creando usuario de prueba test_user_1');
        
        try {
          const newUser = new User({
            userId: 'test_user_1',
            email: 'test@example.com',
            plan: 'mensual',
            expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
          });
          
          await newUser.save();
          console.log('Usuario de prueba creado correctamente');
          
          return res.json({ progress: null });
        } catch (createError) {
          console.error('Error al crear usuario de prueba:', createError);
          return res.status(500).json({ 
            error: 'Error al crear usuario de prueba',
            message: createError.message
          });
        }
      }
      
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Verificar si el usuario tiene progreso guardado
    if (!user.examProgress) {
      console.log(`Usuario ${userId} no tiene progreso guardado`);
      return res.json({ progress: null });
    }
    
    console.log(`Progreso encontrado para usuario ${userId}. Tipo: ${user.examProgress.type}`);
    
    // Si el examen tiene examId, buscar en la colección ExamenResultado
    if (user.examProgress.examId) {
      try {
        // Buscar el examen en la colección ExamenResultado para obtener las userAnswers
        const exam = await ExamenResultado.findById(user.examProgress.examId);
        
        if (exam && exam.userAnswers && exam.userAnswers.length > 0) {
          console.log(`Recuperadas ${exam.userAnswers.length} respuestas del examen ${exam._id}`);
          
          // Asegurar que las userAnswers incluyen el campo long_answer
          const userAnswersWithLongAnswer = exam.userAnswers.map(answer => {
            if (answer.questionData) {
              // Extraer y verificar el campo long_answer explícitamente
              const long_answer = answer.questionData.long_answer || '';
              
              return {
                ...answer.toObject(),
                questionData: {
                  ...answer.questionData,
                  // Asegurar que long_answer se incluye explícitamente
                  long_answer: long_answer
                }
              };
            }
            return answer;
          });
          
          // Construir respuesta con la información esencial y las userAnswers que ya contienen toda la información
          const response = {
            progress: {
              examId: exam._id,
              type: exam.type,
              userAnswers: userAnswersWithLongAnswer, // Usar la versión que garantiza incluir long_answer
              currentQuestion: user.examProgress.currentQuestion,
              timeLeft: user.examProgress.timeLeft,
              totalTime: user.examProgress.totalTime,
              markedAsDoubt: user.examProgress.markedAsDoubt,
              status: 'in_progress',
              score: exam.score || 0,
              correct: exam.correct || 0,
              incorrect: exam.incorrect || 0,
              blank: exam.blank || 0
            }
          };
          
          return res.json(response);
        }
      } catch (examError) {
        console.error('Error al recuperar examen:', examError);
        // Si hay error, continuamos con el comportamiento original
      }
    }
    
    // Comportamiento original si no se pudo obtener userAnswers
    res.json({ progress: user.examProgress });
    console.log(user.examProgress);
  } catch (error) {
    console.error('Error al obtener progreso:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
});

// Ruta para obtener un examen específico para su revisión
app.get('/exam-review/:examId', async (req, res) => {
  try {
    const { examId } = req.params;
    console.log(`===== SOLICITUD DE REVISIÓN DE EXAMEN =====`);
    console.log(`Examen ID: ${examId}`);
    
    // Buscar directamente el examen en la colección ExamenResultado
    const exam = await ExamenResultado.findById(examId);
    
    if (!exam) {
      console.log(`Examen ${examId} no encontrado`);
      return res.status(404).json({ error: 'Examen no encontrado' });
    }
    
    console.log(`Examen encontrado para usuario: ${exam.userId}`);
    console.log(`Tipo de examen: ${exam.type}`);
    console.log(`Fecha del examen: ${exam.date}`);
    console.log(`Total de respuestas guardadas: ${exam.userAnswers?.length || 0}`);
    
    // Construir el array de preguntas completas desde userAnswers
    // que ahora contiene toda la información necesaria
    const questions = exam.userAnswers.map(answer => {
      const questionData = answer.questionData || {};
      
      // Añadir ruta completa a la imagen si existe
      if (questionData.image) {
        questionData.image = `${req.protocol}://${req.get('host')}/preguntas/${questionData.image}`;
      }
      
      // Verificar explícitamente si long_answer existe
      const long_answer = questionData.long_answer || '';
      
      return {
        _id: answer.questionId,
        ...questionData,
        userAnswer: answer.selectedAnswer,
        isCorrect: answer.isCorrect,
        long_answer: long_answer // Asegurar que long_answer está incluido explícitamente
      };
    });
    
    console.log(`Preguntas procesadas para revisión: ${questions.length}`);
    
    // Enviar resultados
    res.json({ 
      exam: exam, 
      questions: questions 
    });
    
    console.log(`===== FIN DE REVISIÓN DE EXAMEN =====`);
    
  } catch (error) {
    console.error('Error al obtener examen para revisión:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para obtener preguntas falladas para el modo "Repite tus errores"
app.get('/failed-questions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ userId });
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Get IDs of failed questions, sort by most recent failures
    const failedQuestionIds = user.failedQuestions
      .sort((a, b) => new Date(b.lastAttempt) - new Date(a.lastAttempt))
      .map(q => q.questionId);
    
    // Get full question data
    const textQuestions = await ExamenCompleto.find({ '_id': { $in: failedQuestionIds } });
    const imageQuestions = await ExamenFotos.find({ '_id': { $in: failedQuestionIds } });
    
    // Create a map for sorting questions in the same order as failedQuestionIds
    const questionMap = {};
    [...textQuestions, ...imageQuestions].forEach(q => {
      questionMap[q._id.toString()] = q;
    });
    
    // Sort questions in the same order as failedQuestionIds
    const orderedQuestions = [];
    for (const id of failedQuestionIds) {
      const question = questionMap[id.toString()];
      if (question) {
        // Add metadata about failure history
        const failureInfo = user.failedQuestions.find(
          q => q.questionId.toString() === id.toString()
        );
        
        const questionWithMeta = question.toObject();
        
        // Add image URL if needed
        if (questionWithMeta.image) {
          questionWithMeta.image = `${BACKEND_URL}/preguntas/${questionWithMeta.image}`;
        }
        
        // Add failure metadata
        if (failureInfo) {
          questionWithMeta.failureInfo = {
            lastAttempt: failureInfo.lastAttempt,
            attemptCount: failureInfo.attemptCount || 1
          };
        }
        
        orderedQuestions.push(questionWithMeta);
      }
    }
    
    // Mostrar todas las preguntas disponibles (antes limitado a 60)
    const limit = orderedQuestions.length; // Sin límite para mostrar todas las preguntas incorrectas
    const questions = orderedQuestions.slice(0, limit);
    
    res.json({
      questions,
      totalAvailable: orderedQuestions.length,
      returned: questions.length
    });
    
  } catch (error) {
    console.error('Error al obtener preguntas falladas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para obtener preguntas no contestadas para practicar
app.get('/practice-unanswered/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 100, page = 0, sort = 'date', order = 'desc', subject } = req.query;
    
    // Buscar usuario y verificar que existe
    const user = await User.findOne({ userId });
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    console.log(`Solicitando preguntas sin contestar para práctica - Usuario: ${userId} (page: ${page}, limit: ${limit})`);
    
    // Construir la consulta para la colección UnansweredQuestion
    const query = { userId };
    
    // Si se especifica filtro por asignatura, agregarlo a la consulta
    if (subject) {
      query.$or = [
        { subject: subject },
        { 'questionData.subject': subject }
      ];
    }
    
    // Contar el total de preguntas que coinciden con la consulta
    const totalAvailable = await UnansweredQuestion.countDocuments(query);
    
    if (totalAvailable === 0) {
      console.log(`No se encontraron preguntas sin contestar con los filtros aplicados`);
      return res.json({ 
        questions: [], 
        totalAvailable: 0, 
        returned: 0,
        message: 'No hay preguntas sin contestar disponibles con los filtros aplicados' 
      });
    }
    
    console.log(`Buscando ${questionIds.length} preguntas en las colecciones para práctica`);
    
    // Obtener preguntas de las colecciones
    const [textQuestions, imageQuestions] = await Promise.all([
      ExamenCompleto.find({ '_id': { $in: questionIds } }),
      ExamenFotos.find({ '_id': { $in: questionIds } })
    ]);
    
    console.log(`Encontradas ${textQuestions.length} preguntas de texto y ${imageQuestions.length} con imagen para práctica`);
    
    // Combinar los resultados y añadir metadata
    const allQuestions = [...textQuestions, ...imageQuestions].map(q => {
      const questionId = q._id.toString();
      const metadata = unansweredMap[questionId] || {};
      
      // Convertir a objeto plano
      const questionData = q.toObject();
      
      // Construir ruta completa de la imagen si existe
      if (questionData.image) {
        questionData.image = `${BACKEND_URL}/preguntas/${questionData.image}`;
      }
      
      // Asegurar que todos los campos necesarios estén presentes
      return {
        _id: questionData._id,
        questionId: questionData._id,
        question: questionData.question || '',
        option_1: questionData.option_1 || '',
        option_2: questionData.option_2 || '',
        option_3: questionData.option_3 || '',
        option_4: questionData.option_4 || '',
        option_5: questionData.option_5 || '',
        answer: questionData.answer || '',
        subject: questionData.subject || 'General',
        image: questionData.image || null,
        long_answer: questionData.long_answer || '',
        unanswered: true,
        lastSeen: metadata.lastSeen || new Date(),
        examId: metadata.examId || null,
        markedAsDoubt: metadata.markedAsDoubt || false
      };
    });
    
    // Ordenar según el parámetro indicado
    let sortedQuestions = [...allQuestions];
    
    if (sort === 'date') {
      // Ordenar por fecha más reciente o más antigua
      sortedQuestions.sort((a, b) => {
        if (order === 'desc') {
          return new Date(b.lastSeen) - new Date(a.lastSeen);
        } else {
          return new Date(a.lastSeen) - new Date(b.lastSeen);
        }
      });
    } else if (sort === 'subject') {
      // Ordenar por asignatura
      sortedQuestions.sort((a, b) => {
        const subjectA = a.subject || '';
        const subjectB = b.subject || '';
        return order === 'desc' 
          ? subjectB.localeCompare(subjectA) 
          : subjectA.localeCompare(subjectB);
      });
    } else if (sort === 'random') {
      // Mezclar las preguntas aleatoriamente
      for (let i = sortedQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sortedQuestions[i], sortedQuestions[j]] = [sortedQuestions[j], sortedQuestions[i]];
      }
    }
    
    // Aplicar paginación
    const startIndex = parseInt(page) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedQuestions = sortedQuestions.slice(startIndex, endIndex);
    
    console.log(`Enviando ${paginatedQuestions.length} preguntas sin contestar para práctica (${startIndex}-${endIndex})`);
    
    res.json({
      questions: paginatedQuestions,
      totalAvailable: allQuestions.length,
      returned: paginatedQuestions.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(allQuestions.length / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Error al obtener preguntas sin contestar para práctica:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// Ruta para actualizar la lista de preguntas falladas
app.post('/update-failed-questions', async (req, res) => {
  const { userId, failedQuestions } = req.body;
  
  if (!userId || !failedQuestions) {
    return res.status(400).json({ error: 'userId y failedQuestions son requeridos' });
  }
  
  try {
    // Get existing user data
    const user = await User.findOne({ userId });
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    console.log(`Actualizando preguntas falladas para usuario ${userId}`);
    console.log(`Preguntas falladas recibidas: ${failedQuestions.length}`);
    
    // Si el usuario no tiene un array de preguntas falladas, crearlo
    if (!user.failedQuestions || !Array.isArray(user.failedQuestions)) {
      user.failedQuestions = [];
      console.log(`Inicializando array de preguntas falladas para ${userId}`);
    }
    
    // Create a map of existing failed questions for easy lookup
    const existingFailedMap = {};
    user.failedQuestions.forEach(q => {
      if (q.questionId) {
        existingFailedMap[q.questionId.toString()] = q;
      }
    });
    
    console.log(`Preguntas falladas existentes: ${Object.keys(existingFailedMap).length}`);
    
    // Process new failed questions, preserving existing ones
    let addedCount = 0;
    let updatedCount = 0;
    
    // Creamos una nueva copia del array para no modificar directamente el original
    const mergedFailedQuestions = [...user.failedQuestions];
    
    failedQuestions.forEach(newFailed => {
      if (!newFailed.questionId) {
        console.log(`Advertencia: Pregunta fallada sin questionId omitida`);
        return; // Skip items without questionId
      }
      
      const questionId = newFailed.questionId.toString();
      
      if (existingFailedMap[questionId]) {
        // Update existing record with new timestamp and increment attempt count
        const existingIndex = mergedFailedQuestions.findIndex(
          q => q.questionId && q.questionId.toString() === questionId
        );
        
        if (existingIndex !== -1) {
          const existing = mergedFailedQuestions[existingIndex];
          mergedFailedQuestions[existingIndex] = {
            questionId: existing.questionId,
            subject: newFailed.subject || existing.subject,
            lastAttempt: new Date(),
            attemptCount: (existing.attemptCount || 0) + 1
          };
          updatedCount++;
        }
      } else {
        // Add new failed question
        mergedFailedQuestions.push({
          questionId: newFailed.questionId,
          subject: newFailed.subject || 'General',
          lastAttempt: new Date(),
          attemptCount: 1
        });
        addedCount++;
      }
    });
    
    // Verificar duplicados por si acaso (medida de seguridad adicional)
    const questionIds = new Set();
    const finalFailedQuestions = [];
    
    mergedFailedQuestions.forEach(question => {
      if (question.questionId) {
        const id = question.questionId.toString();
        if (!questionIds.has(id)) {
          questionIds.add(id);
          finalFailedQuestions.push(question);
        } else {
          console.log(`Eliminando pregunta duplicada: ${id}`);
        }
      }
    });
    
    console.log(`Preguntas actualizadas: ${updatedCount}`);
    console.log(`Preguntas añadidas: ${addedCount}`);
    console.log(`Total de preguntas falladas después de la operación: ${finalFailedQuestions.length}`);
    
    // Update user with new failed questions list
    await User.findOneAndUpdate(
      { userId },
      { $set: { failedQuestions: finalFailedQuestions } }
    );
    
    res.json({ 
      message: 'Preguntas falladas actualizadas con éxito',
      count: finalFailedQuestions.length,
      added: addedCount,
      updated: updatedCount
    });
  } catch (error) {
    console.error('Error al actualizar preguntas falladas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Exam History Routes
app.get('/exam-history/:userId', verifyUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    console.log(`Solicitado historial de exámenes para usuario: ${userId}`);
    
    // Buscar exámenes en la colección ExamenResultado en lugar de en el usuario
    const examHistory = await ExamenResultado.find({ 
      userId,
      status: 'completed' // Solo recuperar exámenes completados
    }).sort({ date: -1 }); // Ordenar por fecha descendente (más reciente primero)
    
    console.log(`Enviando ${examHistory.length} exámenes para usuario ${userId}`);
    res.json(examHistory);
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para obtener preguntas no contestadas
app.get('/unanswered-questions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 100, page = 0, sort = 'date', order = 'desc' } = req.query;
    
    console.log(`Obteniendo preguntas sin contestar para usuario: ${userId} (page: ${page}, limit: ${limit})`);
    
    // Verificar que el usuario existe
    const user = await User.findOne({ userId });
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Buscar directamente en la colección de preguntas sin contestar
    const query = { userId };
    const totalCount = await UnansweredQuestion.countDocuments(query);
    
    if (totalCount === 0) {
      console.log(`El usuario ${userId} no tiene preguntas sin contestar registradas`);
      return res.json({ 
        questions: [], 
        totalAvailable: 0, 
        returned: 0,
        message: 'No hay preguntas sin contestar'
      });
    }
    
    console.log(`Se encontraron ${totalCount} preguntas sin contestar en la colección`);
    
    // Ordenar según el parámetro indicado
    let sortOptions = {};
    if (sort === 'date') {
      sortOptions = { lastSeen: order === 'desc' ? -1 : 1 };
    } else if (sort === 'subject') {
      sortOptions = { subject: order === 'desc' ? -1 : 1 };
    }
    
    // Aplicar paginación
    const skip = parseInt(page) * parseInt(limit);
    
    // Obtener preguntas paginadas y ordenadas
    const unansweredDocs = await UnansweredQuestion.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Extraer los IDs de las preguntas para buscar en las colecciones de preguntas
    const questionIds = unansweredDocs.map(q => new mongoose.Types.ObjectId(q.questionId));
    
    console.log(`Buscando ${questionIds.length} preguntas en las colecciones`);
    
    // Obtener datos completos de preguntas desde las colecciones originales si es necesario
    // (solo si la información en unansweredDocs.questionData no es suficiente)
    const [textQuestions, imageQuestions] = await Promise.all([
      ExamenCompleto.find({ '_id': { $in: questionIds } }),
      ExamenFotos.find({ '_id': { $in: questionIds } })
    ]);
    
    // Crear un mapa para facilitar la búsqueda de preguntas completas
    const fullQuestionsMap = {};
    [...textQuestions, ...imageQuestions].forEach(q => {
      fullQuestionsMap[q._id.toString()] = q;
    });
    
    // Construir respuesta combinando datos de UnansweredQuestion y las colecciones de preguntas
    const questions = unansweredDocs.map(unanswered => {
      const questionId = unanswered.questionId.toString();
      const fullQuestion = fullQuestionsMap[questionId];
      
      // Si tenemos información completa en questionData, usarla
      // Si no, complementar con datos de las colecciones de preguntas
      const questionData = unanswered.questionData && Object.keys(unanswered.questionData).length > 0
        ? unanswered.questionData
        : (fullQuestion || {});
      
      // Construir objeto de respuesta
      return {
        _id: unanswered._id,
        questionId: unanswered.questionId,
        question: questionData.question || '',
        option_1: questionData.option_1 || '',
        option_2: questionData.option_2 || '',
        option_3: questionData.option_3 || '',
        option_4: questionData.option_4 || '',
        option_5: questionData.option_5 || '',
        answer: questionData.answer || '',
        subject: questionData.subject || unanswered.subject || 'General',
        image: questionData.image ? `${req.protocol}://${req.get('host')}/preguntas/${questionData.image}` : null,
        long_answer: questionData.long_answer || '',
        unanswered: true,
        markedAsDoubt: unanswered.markedAsDoubt || false,
        lastSeen: unanswered.lastSeen || new Date(),
        examId: unanswered.examId || null
      };
    });
    
    console.log(`Enviando ${questions.length} preguntas sin contestar (${skip}-${skip + questions.length})`);
    
    // Retornar resultados con metadatos para paginación
    res.json({
      questions,
      totalAvailable: totalCount,
      returned: questions.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Error al obtener preguntas no contestadas:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

app.post('/validate-and-save-exam', verifyUser, verifySubscription, async (req, res) => {
  // El middleware ya verificó que el usuario existe y tiene suscripción activa
  const { 
    examType, 
    questions, 
    userAnswers, 
    selectedAnswers, 
    timeUsed, 
    totalTime,
    markedAsDoubt 
  } = req.body;
  
  const userId = req.user.userId;
  
  console.log(`Recibida solicitud para finalizar examen tipo ${examType} para usuario ${userId}`);
  
  // Log detallado de la información recibida
  console.log('=== INFORMACIÓN DETALLADA DEL EXAMEN RECIBIDO ===');
  console.log('Tipo de examen:', examType);
  console.log('Usuario ID:', userId);
  console.log('Tiempo usado:', timeUsed);
  console.log('Tiempo total:', totalTime);
  console.log('Número de preguntas:', questions?.length || 0);
  console.log('Respuestas de usuario recibidas:', userAnswers?.length || 0);
  console.log('Respuestas seleccionadas recibidas:', selectedAnswers ? Object.keys(selectedAnswers).length : 0);
  console.log('Preguntas marcadas como duda:', markedAsDoubt ? Object.keys(markedAsDoubt).length : 0);
  
  // Mostrar detalles completos de userAnswers
  console.log('=== DETALLE COMPLETO DE userAnswers ===');
  if (userAnswers && Array.isArray(userAnswers)) {
    console.log('Estructura de userAnswers:', JSON.stringify(userAnswers, null, 2));
    
    // Mostrar cada respuesta individualmente para mejor legibilidad
    userAnswers.forEach((answer, index) => {
      console.log(`Respuesta ${index + 1}:`, JSON.stringify(answer));
    });
    
    // Analizar tipos de datos en userAnswers
    const types = userAnswers.map(ans => typeof ans);
    console.log('Tipos de datos en userAnswers:', types);
    
    // Verificar si hay propiedades específicas en los objetos
    if (userAnswers.length > 0 && typeof userAnswers[0] === 'object') {
      const keys = userAnswers[0] ? Object.keys(userAnswers[0]) : [];
      console.log('Propiedades del primer objeto de respuesta:', keys);
    }
  } else {
    console.log('userAnswers no es un array o está vacío');
    console.log('Valor de userAnswers:', userAnswers);
  }
  
  // También mostrar selectedAnswers si existe
  if (selectedAnswers) {
    console.log('=== DETALLE DE selectedAnswers ===');
    console.log('Estructura de selectedAnswers:', JSON.stringify(selectedAnswers, null, 2));
  }
  
  console.log('Primera pregunta:', questions && questions.length > 0 ? JSON.stringify(questions[0]) : 'No hay preguntas');
  console.log('=== FIN INFORMACIÓN DETALLADA ===');
  
  if (!examType) {
    console.error('Falta el tipo de examen');
    return res.status(400).json({ error: 'Falta el tipo de examen' });
  }

  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    console.error('Preguntas inválidas o vacías');
    return res.status(400).json({ error: 'Las preguntas son inválidas o están vacías' });
  }

  // Verificar que todas las preguntas tengan un _id válido
  const questionsWithoutId = questions.filter(q => !q._id).length;
  if (questionsWithoutId > 0) {
    console.warn(`ADVERTENCIA: Se detectaron ${questionsWithoutId} preguntas sin ID válido.`);
    
    // Asignar IDs temporales a preguntas sin ID
    questions.forEach((q, idx) => {
      if (!q._id) {
        // Crear un ID único temporal basado en contenido o índice
        const tempId = new mongoose.Types.ObjectId();
        console.log(`Asignando ID temporal ${tempId} a pregunta en posición ${idx}`);
        q._id = tempId;
      }
    });
  }

  try {
    // El usuario ya está disponible en req.user gracias al middleware
    const user = req.user;

    // 1. Validar respuestas y calcular estadísticas
    let correct = 0, incorrect = 0, blank = 0;
    const questionResults = [];

    // Convertir selectedAnswers de objeto a array si es necesario
    // Primero intentamos usar userAnswers, si no está disponible usamos selectedAnswers
    let userAnswersToProcess = [];
    
    if (Array.isArray(userAnswers) && userAnswers.length > 0) {
      // Procesar userAnswers cuando ya viene como array de objetos
      // Extraer solo el valor de selectedAnswer si es un objeto complejo
      userAnswersToProcess = userAnswers.map(ans => {
        if (ans && typeof ans === 'object') {
          // Si selectedAnswer es explícitamente null, mantenerlo como null
          if ('selectedAnswer' in ans && ans.selectedAnswer === null) {
            return null;
          }
          // Si existe selectedAnswer, usarlo
          if ('selectedAnswer' in ans) {
            return ans.selectedAnswer;
          }
        }
        return ans;
      });
    } else if (selectedAnswers && typeof selectedAnswers === 'object') {
      // Convertir de objeto a array, preservando null explícitamente
      userAnswersToProcess = questions.map((_, index) => {
        // Si el índice existe en selectedAnswers pero es null, mantenerlo como null
        if (index in selectedAnswers && selectedAnswers[index] === null) {
          return null;
        }
        return selectedAnswers[index] || null;
      });
    } else {
      console.warn('No se proporcionaron respuestas de usuario válidas');
      userAnswersToProcess = new Array(questions.length).fill(null);
    }
    console.log(`Procesando ${userAnswersToProcess.length} respuestas para ${questions.length} preguntas`);
    
    // Validación de respuestas con almacenamiento de información completa de preguntas
    questions.forEach((question, index) => {
      const userAns = userAnswersToProcess[index];
      const correctAns = question.answer;
      
      // Verificar si la pregunta está marcada como duda
      const isMarkedAsDoubt = markedAsDoubt && markedAsDoubt[index] === true;
      
      // Datos completos de la pregunta para almacenar
      const questionData = {
        question: question.question || '',
        option_1: question.option_1 || '',
        option_2: question.option_2 || '',
        option_3: question.option_3 || '',
        option_4: question.option_4 || '',
        option_5: question.option_5 || '',
        answer: question.answer || '',
        subject: question.subject || 'General',
        image: question.image || null,
        long_answer: question.long_answer || '' // Incluir long_answer de la pregunta original
      };
      
      // Determinar si la respuesta es correcta, incorrecta o en blanco
      // Verificar explícitamente si es null o undefined para detectar preguntas no contestadas
      if (userAns === null || userAns === undefined || userAns === '') {
        blank++;
        const questionId = question._id || null;
        
        // Verificar que la pregunta tenga un ID válido
        if (!questionId) {
          console.log(`ADVERTENCIA: Pregunta sin ID detectada en el índice ${index}:`, question);
        }
        
        questionResults.push({
          questionId: questionId,
          selectedAnswer: null,
          isCorrect: null,
          questionData: questionData,
          needsReview: true, // Marcar para revisión automática
          unanswered: true, // Marcar explícitamente como no contestada
          markedAsDoubt: isMarkedAsDoubt // Indicar si está marcada como duda
        });
      } else {
        // Verificar si la respuesta es correcta usando la misma lógica que en la primera sección
        let isCorrect = false;
        
        // Caso 1: userAns es el número de la respuesta (como string o número)
        if (String(userAns) === String(correctAns)) {
          isCorrect = true;
        } 
        // Caso 2: userAns es el texto completo de la opción correcta
        else if (userAns === question[`option_${correctAns}`]) {
          isCorrect = true;
        }
        // Caso 3: La respuesta correcta es el texto y userAns es el número
        else if (correctAns === 'A' || correctAns === 'B' || 
                 correctAns === 'C' || correctAns === 'D' || 
                 correctAns === 'E') {
          // Convertir letra a número (A=1, B=2, etc.)
          const letterToNumber = {
            'A': '1', 'B': '2', 'C': '3', 'D': '4', 'E': '5'
          };
          if (String(userAns) === letterToNumber[correctAns]) {
            isCorrect = true;
          }
        }
        // Caso 4: La respuesta correcta es el número y userAns es la letra
        else if (correctAns === '1' || correctAns === '2' || 
                 correctAns === '3' || correctAns === '4' || 
                 correctAns === '5' || 
                 correctAns === 1 || correctAns === 2 || 
                 correctAns === 3 || correctAns === 4 || 
                 correctAns === 5) {
          // Convertir número a letra (1=A, 2=B, etc.)
          const numberToLetter = {
            '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E'
          };
          if (String(userAns) === numberToLetter[String(correctAns)]) {
            isCorrect = true;
          }
        }
        
        if (isCorrect) {
          correct++;
          questionResults.push({
            questionId: question._id,
            selectedAnswer: userAns,
            isCorrect: true,
            questionData: questionData,
            markedAsDoubt: isMarkedAsDoubt // Indicar si está marcada como duda
          });
        } else {
          incorrect++;
          questionResults.push({
            questionId: question._id,
            selectedAnswer: userAns,
            isCorrect: false,
            questionData: questionData,
            needsReview: true, // Marcar para revisión automática
            markedAsDoubt: isMarkedAsDoubt // Indicar si está marcada como duda
          });
        };
      }
    });

    console.log(`Resultados: ${correct} correctas, ${incorrect} incorrectas, ${blank} en blanco`);
    
    // 3. Calcular puntuación según el tipo de examen
    let score = 0;
    switch(examType) {
      case 'simulacro':
        // Fórmula: 3 puntos por correcta, -1 por incorrecta
        score = (correct * 3) - incorrect;
        break;
      case 'protocolos':
        // Formula para protocolos
        score = (correct * 3) - incorrect;
        break;
      case 'quizz':
      case 'errores':
      case 'aeleccion':
        // Sin penalización
        score = (correct / questions.length) * 10;
        break;
      case 'contrarreloj':
        // Contrarreloj - bonificación por tiempo restante
        const baseScore = (correct / questions.length) * 10;
        const timeBonus = Math.min(2, (totalTime - timeUsed) / totalTime * 2);
        score = baseScore + timeBonus;
        break;
      default:
        // Puntuación por defecto
        score = (correct / questions.length) * 10;
    }
    
    // Asegurar que la puntuación no sea negativa
    score = Math.max(0, score);
    console.log(`Puntuación final: ${score.toFixed(2)}`);

    // 4. Crear objeto de examen para guardar - ahora con datos completos
    // Asegurarse de que los questionResults estén en el formato correcto
    const formattedQuestionResults = questionResults.map(result => {
      // Extraer y verificar el campo long_answer explícitamente
      const long_answer = result.questionData && result.questionData.long_answer 
        ? result.questionData.long_answer 
        : '';
      
      return {
        questionId: result.questionId,
        selectedAnswer: result.selectedAnswer === null ? null : String(result.selectedAnswer),
        isCorrect: result.isCorrect,
        questionData: {
          question: result.questionData.question || '',
          option_1: result.questionData.option_1 || '',
          option_2: result.questionData.option_2 || '',
          option_3: result.questionData.option_3 || '',
          option_4: result.questionData.option_4 || '',
          option_5: result.questionData.option_5 || '',
          answer: result.questionData.answer || '',
          subject: result.questionData.subject || 'General',
          image: result.questionData.image,
          long_answer: long_answer // Incluir long_answer explícitamente
        },
        markedAsDoubt: result.markedAsDoubt || false // Incluir si está marcada como duda
      };
    });
    
    // Crear el objeto de examen para ExamenResultado
    const examData = {
      userId,
      type: examType,
      userAnswers: formattedQuestionResults, // Contiene toda la información necesaria
      correct,
      incorrect,
      blank,
      totalQuestions: questions.length,
      timeUsed,
      score: parseFloat(score.toFixed(2)),
      date: new Date(),
      status: 'completed',
      markedAsDoubt // Guardar también el objeto markedAsDoubt completo
    };

    if (totalTime) examData.totalTime = totalTime;
    if (selectedAnswers) examData.selectedAnswers = selectedAnswers;
    
    // Verificar si existe un examen en progreso que se deba actualizar
    let examenResultado;
    let examId = req.body.examId || (req.body.examData && req.body.examData.examId) || (user.examProgress && user.examProgress.examId);
    
    if (examId) {
      console.log(`Buscando examen en progreso con ID: ${examId}`);
      try {
        // Buscar el examen existente
        const existingExam = await ExamenResultado.findById(examId);
        
        if (existingExam) {
          console.log(`Examen encontrado. Estado actual: ${existingExam.status}`);
          
          // Actualizar el examen existente en lugar de crear uno nuevo
          Object.assign(existingExam, examData);
          await existingExam.save();
          
          examenResultado = existingExam;
          console.log(`Examen ${existingExam._id} actualizado a estado completed`);
        } else {
          console.log(`No se encontró examen con ID ${examId}, creando uno nuevo`);
          // Crear un nuevo examen
          examenResultado = new ExamenResultado(examData);
          await examenResultado.save();
          console.log(`Nuevo examen creado con ID: ${examenResultado._id}`);
        }
      } catch (error) {
        console.error(`Error al buscar/actualizar examen existente: ${error.message}`);
        // Si hay error, crear uno nuevo
        examenResultado = new ExamenResultado(examData);
        await examenResultado.save();
        console.log(`Examen creado con ID: ${examenResultado._id} (después de error)`);
      }
    } else {
      // No hay ID de examen previo, crear uno nuevo
      examenResultado = new ExamenResultado(examData);
      await examenResultado.save();
      console.log(`Nuevo examen creado con ID: ${examenResultado._id}`);
    }
    
    console.log('Examen guardado en ExamenResultado con ID:', examenResultado._id);

    // 4. Actualizar las preguntas incorrectas/sin contestar en el perfil del usuario
    try {
      // Extraer preguntas incorrectas y sin contestar
      const incorrectQuestions = questionResults.filter(q => q.isCorrect === false).map(q => ({
        questionId: q.questionId,
        selectedAnswer: q.selectedAnswer,
        questionData: q.questionData,
        needsReview: true,
        reviewStatus: 'pending',
        markedAsDoubt: q.markedAsDoubt || false
      }));
      
      // Detectar explícitamente preguntas sin contestar (selectedAnswer === null)
      const unansweredQuestions = questionResults.filter(q => 
        q.isCorrect === null || q.selectedAnswer === null || q.unanswered === true
      ).map(q => {
        // Verificar que tiene questionId
        if (!q.questionId) {
          console.log('ALERTA: Encontrada pregunta sin contestar sin questionId:', JSON.stringify(q));
          return null;
        }
        
        return {
          questionId: q.questionId,
          questionData: q.questionData,
          needsReview: true,
          reviewStatus: 'pending',
          unanswered: true,
          markedAsDoubt: q.markedAsDoubt || false,
          // Añadir fecha para mejor seguimiento
          addedAt: new Date()
        };
      }).filter(q => q !== null); // Eliminar entradas nulas
      
      console.log(`Preguntas incorrectas: ${incorrectQuestions.length}, Preguntas sin contestar: ${unansweredQuestions.length}`);
      
      // Verificar en detalle las preguntas sin contestar
      if (unansweredQuestions.length === 0) {
        console.log('DIAGNÓSTICO: No se detectaron preguntas sin contestar. Verificando userAnswersToProcess...');
        
        // Verificar userAnswersToProcess en busca de respuestas nulas
        const nullAnswersCount = userAnswersToProcess.filter(ans => ans === null || ans === undefined || ans === '').length;
        console.log(`Respuestas nulas en userAnswersToProcess: ${nullAnswersCount} de ${userAnswersToProcess.length}`);
        
        // Verificar por qué questionResults podría no estar marcando preguntas como unanswered
        const nullQuestionResults = questionResults.filter(q => q.selectedAnswer === null).length;
        console.log(`Respuestas nulas en questionResults: ${nullQuestionResults} de ${questionResults.length}`);
        
        // Si hay respuestas nulas pero no están siendo identificadas correctamente, crear manualmente el array
        if (nullAnswersCount > 0 && unansweredQuestions.length === 0) {
          console.log('Creando manualmente array de preguntas sin contestar...');
          
          // Para cada respuesta nula, crear un objeto de pregunta sin contestar
          userAnswersToProcess.forEach((ans, index) => {
            if (ans === null || ans === undefined || ans === '') {
              if (index < questions.length && questions[index] && questions[index]._id) {
                // Obtener datos de la pregunta
                const q = questions[index];
                const isMarkedAsDoubt = markedAsDoubt && markedAsDoubt[index] === true;
                
                // Crear objeto de pregunta sin contestar
                unansweredQuestions.push({
                  questionId: q._id,
                  questionData: {
                    question: q.question || '',
                    option_1: q.option_1 || '',
                    option_2: q.option_2 || '',
                    option_3: q.option_3 || '',
                    option_4: q.option_4 || '',
                    option_5: q.option_5 || '',
                    answer: q.answer || '',
                    subject: q.subject || 'General',
                    image: q.image || null,
                    long_answer: q.long_answer || ''
                  },
                  needsReview: true,
                  reviewStatus: 'pending',
                  unanswered: true,
                  markedAsDoubt: isMarkedAsDoubt
                });
              }
            }
          });
          
          console.log(`Se crearon manualmente ${unansweredQuestions.length} preguntas sin contestar`);
        }
      }
      
      // Preparar la actualización del usuario
      const updateQuery = { 
        $unset: { examProgress: "" } // Limpiar el progreso ya que el examen está completado
      };
      
      // Agregar preguntas incorrectas al perfil del usuario para revisión automática
      if (incorrectQuestions.length > 0) {
        // Primero eliminamos cualquier pregunta incorrecta existente con el mismo ID para evitar duplicados
        await User.updateOne(
          { userId },
          { $pull: { failedQuestions: { questionId: { $in: incorrectQuestions.map(q => q.questionId) } } } }
        );
        // Luego agregamos las nuevas preguntas incorrectas
        updateQuery.$addToSet = { failedQuestions: { $each: incorrectQuestions } };
      }
      
      // También registramos las preguntas sin contestar para revisión automática
      if (unansweredQuestions.length > 0 && examType !== 'contrarreloj') {
        console.log(`Procesando ${unansweredQuestions.length} preguntas sin contestar para guardar`);
        
        // Verificar que todas las preguntas sin contestar tengan un ID válido
        const validUnansweredQuestions = unansweredQuestions.filter(q => {
          if (!q.questionId) {
            console.log('ADVERTENCIA: Pregunta sin contestar sin questionId detectada:', q);
            return false;
          }
          return true;
        });
        
        if (validUnansweredQuestions.length !== unansweredQuestions.length) {
          console.log(`ADVERTENCIA: Se filtraron ${unansweredQuestions.length - validUnansweredQuestions.length} preguntas sin ID válido`);
        }
        
        console.log(`Continuando con ${validUnansweredQuestions.length} preguntas sin contestar válidas`);
        
        if (validUnansweredQuestions.length === 0) {
          console.log('No hay preguntas sin contestar válidas para guardar, omitiendo actualización');
        } else {
          try {
            // Convertir questionIds a ObjectId cuando sea posible
            const questionIds = validUnansweredQuestions.map(q => {
              try {
                return mongoose.Types.ObjectId.isValid(q.questionId)
                  ? new mongoose.Types.ObjectId(q.questionId.toString())
                  : q.questionId;
              } catch (e) {
                console.log(`Error al convertir questionId ${q.questionId}: ${e.message}`);
                return q.questionId;
              }
            });
            
            // Verificar qué preguntas ya existen en la base de datos para este usuario
            console.log(`Verificando duplicados para ${questionIds.length} preguntas sin contestar`);
            const existingQuestions = await UnansweredQuestion.find({
              userId,
              questionId: { $in: questionIds }
            });
            
            // Crear un mapa para verificación rápida
            const existingMap = {};
            existingQuestions.forEach(q => {
              existingMap[q.questionId.toString()] = true;
            });
            
            console.log(`Se encontraron ${existingQuestions.length} preguntas que ya existían en la BD`);
            
            // Filtrar las preguntas que ya existen
            const uniqueQuestions = validUnansweredQuestions.filter(q => {
              const id = q.questionId.toString();
              if (existingMap[id]) {
                // Si ya existe, loguear y excluir
                console.log(`Excluyendo pregunta ${id} que ya existe en la BD`);
                return false;
              }
              return true;
            });
            
            console.log(`Se agregarán ${uniqueQuestions.length} preguntas nuevas (${validUnansweredQuestions.length - uniqueQuestions.length} filtradas por ya existir)`);
            
            if (uniqueQuestions.length === 0) {
              console.log('Todas las preguntas sin contestar ya existen en la BD, omitiendo inserción');
            } else {
              // Crear documentos para la colección UnansweredQuestion solo con las preguntas únicas
              const unansweredDocs = uniqueQuestions.map(q => {
                // Asegurar que questionId sea un ObjectId válido
                let questionId;
                try {
                  questionId = mongoose.Types.ObjectId.isValid(q.questionId)
                    ? new mongoose.Types.ObjectId(q.questionId.toString())
                    : q.questionId;
                } catch (e) {
                  questionId = q.questionId;
                }
                
                return {
                  userId,
                  questionId: questionId,
                  subject: q.questionData?.subject || 'General',
                  questionData: q.questionData || {},
                  examId: q.examId ? new mongoose.Types.ObjectId(q.examId) : undefined,
                  lastSeen: new Date(),
                  needsReview: true,
                  markedAsDoubt: q.markedAsDoubt || false
                };
              });
              
              // Usar bulkWrite con updateOne y upsert para manejar posibles duplicados
              const bulkOps = unansweredDocs.map(doc => ({
                updateOne: {
                  filter: { 
                    userId: doc.userId, 
                    questionId: doc.questionId 
                  },
                  update: { 
                    $set: doc,
                    $setOnInsert: { createdAt: new Date() }
                  },
                  upsert: true
                }
              }));
              
              try {
                const bulkResult = await UnansweredQuestion.bulkWrite(bulkOps, { ordered: false });
                console.log(`Operación masiva completada: ${bulkResult.upsertedCount} nuevas, ${bulkResult.modifiedCount} actualizadas`);
                
                // Mostrar IDs de las primeras 5 preguntas como ejemplo
                if (unansweredDocs.length > 0) {
                  const exampleIds = unansweredDocs.slice(0, 5).map(q => q.questionId.toString());
                  console.log(`Ejemplo de IDs: ${exampleIds.join(', ')}`);
                }
              } catch (bulkError) {
                // Manejar errores de escritura por duplicados u otros
                if (bulkError.writeErrors) {
                  const duplicates = bulkError.writeErrors.filter(e => e.code === 11000).length;
                  console.log(`Errores por duplicados: ${duplicates}`);
                  console.log(`Otros errores de escritura: ${bulkError.writeErrors.length - duplicates}`);
                }
                console.error('Error al procesar operación masiva:', bulkError.message);
              }
            }
          } catch (error) {
            console.error('Error al procesar preguntas sin contestar:', error.message);
          }
        }
      } else if (examType === 'contrarreloj') {
        console.log('Omitiendo guardar preguntas sin contestar para examen de contrarreloj');
      } else {
        console.log('No hay preguntas sin contestar para guardar');
      }
      
      // Actualizar el usuario
      await User.findOneAndUpdate(
        { userId },
        updateQuery
      );

      console.log('Usuario actualizado con preguntas incorrectas y sin contestar');
      
      // Log final de diagnóstico
      console.log('=== RESUMEN FINAL DEL PROCESO ===');
      console.log(`Total preguntas: ${questions.length}`);
      console.log(`Correctas: ${correct}, Incorrectas: ${incorrect}, Sin contestar: ${blank}`);
      console.log(`Preguntas incorrectas guardadas: ${incorrectQuestions.length}`);
      console.log(`Preguntas sin contestar válidas para guardar: ${unansweredQuestions.filter(q => q.questionId).length}`);
      console.log('=============================');
    } catch (updateError) {
      console.error('Error al actualizar usuario con preguntas incorrectas:', updateError);
      // No devolvemos error ya que el examen se guardó correctamente
    }

    // 5. Devolver resultados
    res.json({
      message: 'Examen completado y guardado con éxito',
      examId: examenResultado._id,
      results: {
        correct,
        incorrect,
        blank,
        score,
        questionResults
      }
    });

  } catch (error) {
    console.error('Error al procesar el examen:', error);
    res.status(500).json({ 
      error: `Error interno del servidor: ${error.message}`,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Endpoint para guardar progreso de examen sin marcarlo como finalizado
app.post('/save-exam-progress', async (req, res) => {
  try {
    const { userId, examData } = req.body;
    
    if (!userId || !examData) {
      return res.status(400).json({ error: 'Se requieren userId y examData' });
    }
    
    console.log(`Guardando progreso de examen para usuario ${userId}`);
    
    // Buscar al usuario
    const user = await User.findOne({ userId });
    
    if (!user) {
      console.log(`No se encontró el usuario ${userId}, creando uno nuevo...`);
      
      // Crear un nuevo usuario si no existe
      const newUser = new User({
        userId,
        email: `${userId}@temp.com`,
        plan: 'anual',
        examHistory: [] // Inicializar array vacío
      });
      
      await newUser.save();
      console.log(`Usuario ${userId} creado correctamente`);
    }

    // Buscar un examen en progreso existente o crear uno nuevo
    let examId = examData.examId;
    let examenResultado;

    if (examId) {
      // Si se proporciona un examId, buscar el examen existente
      examenResultado = await ExamenResultado.findById(examId);

      if (examenResultado) {
        console.log(`Examen existente encontrado con ID: ${examId}`);
        
        // Actualizar el examen existente
        examenResultado.userAnswers = examData.userAnswers || [];
        examenResultado.currentQuestion = examData.currentQuestion || 0;
        examenResultado.timeLeft = examData.timeLeft;
        examenResultado.timeUsed = examData.timeUsed || 0;
        examenResultado.markedAsDoubt = examData.markedAsDoubt || {};
        examenResultado.selectedAnswers = examData.selectedAnswers || {};
        examenResultado.status = examData.status || 'in_progress';
        
        await examenResultado.save();
        console.log(`Examen ${examId} actualizado correctamente`);
      } else {
        console.log(`No se encontró el examen con ID ${examId}, creando uno nuevo...`);
        examId = null; // Forzar la creación de un nuevo examen
      }
    }

    if (!examId) {
      // Crear un nuevo examen en la colección ExamenResultado
      const newExam = {
        userId,
        type: examData.type,
        questions: examData.questions || [],
        userAnswers: examData.userAnswers || [],
        totalQuestions: examData.questions?.length || examData.totalQuestions || 0,
        timeUsed: examData.timeUsed || 0,
        score: 0,
        status: examData.status || 'in_progress',
        currentQuestion: examData.currentQuestion || 0,
        timeLeft: examData.timeLeft,
        totalTime: examData.totalTime,
        markedAsDoubt: examData.markedAsDoubt || {},
        selectedAnswers: examData.selectedAnswers || {},
        date: new Date()
      };
      
      examenResultado = new ExamenResultado(newExam);
      await examenResultado.save();
      examId = examenResultado._id;
      console.log(`Nuevo examen creado con ID: ${examId}`);
    }

    // Actualizar el usuario con la referencia al examen en progreso
    await User.updateOne(
      { userId },
      { 
        $set: { 
          examProgress: {
            examId,
            type: examData.type,
            currentQuestion: examData.currentQuestion || 0,
            timeLeft: examData.timeLeft,
            totalTime: examData.totalTime,
            markedAsDoubt: examData.markedAsDoubt || {},
            selectedAnswers: examData.selectedAnswers || {},
            status: 'in_progress',
            date: new Date()
          }
        }
      }
    );
    
    console.log(`Progreso guardado correctamente para usuario ${userId}`);
    
    res.json({
      success: true,
      message: 'Progreso guardado correctamente',
      examId
    });
    
  } catch (error) {
    console.error("ERROR EN /save-exam-progress:", error);
    res.status(500).json({
      error: 'Error al guardar progreso del examen',
      message: error.message,
      stack: error.stack
    });
  }
});

app.post('/validate-and-save-exam-in-progress', async (req, res) => {
  try {
    const { userId, examData } = req.body;
    
    if (!userId || !examData) {
      return res.status(400).json({ error: 'Se requieren userId y examData' });
    }
    
    console.log('====== INICIO SAVE EXAM PROGRESS ======');
    console.log(`Guardando progreso de examen para usuario ${userId}`);
    console.log(`Tipo de examen: ${examData.type}`);
    console.log(`ID de examen recibido: ${examData.examId || 'No proporcionado'}`);
    console.log(`Número de preguntas: ${examData.questions?.length || 0}`);
    console.log(`Número de respuestas: ${examData.userAnswers?.length || 0}`);
    
    // DEBUGGING: Examinar la estructura de userAnswers
    if (examData.userAnswers && examData.userAnswers.length > 0) {
      console.log(`Primera respuesta recibida:`, JSON.stringify(examData.userAnswers[0]));
    }
    
    // Verificar si hay preguntas marcadas como duda
    const hasMarkedAsDoubt = examData.markedAsDoubt && Object.keys(examData.markedAsDoubt).length > 0;
    console.log(`Preguntas marcadas como duda: ${hasMarkedAsDoubt ? Object.keys(examData.markedAsDoubt).length : 0}`);
    
    // Buscar al usuario
    const user = await User.findOne({ userId });
    
    if (!user) {
      console.log(`No se encontró el usuario ${userId}, creando uno nuevo...`);
      
      // Crear un nuevo usuario si no existe
      const newUser = new User({
        userId,
        email: `${userId}@temp.com`,
        plan: 'anual',
        examHistory: [] // Inicializar array vacío
      });
      
      await newUser.save();
      console.log(`Usuario ${userId} creado correctamente`);
    }
    
    // Procesar userAnswers para incluir marcadas como duda
    let processedUserAnswers = [];
    
    if (examData.userAnswers && Array.isArray(examData.userAnswers)) {
      processedUserAnswers = examData.userAnswers.map((answer, index) => {
        // Determinar si esta pregunta está marcada como duda
        const isMarkedAsDoubt = examData.markedAsDoubt && examData.markedAsDoubt[index] === true;
        
        // Si el answer ya es un objeto
        if (answer && typeof answer === 'object') {
          return {
            ...answer,
            markedAsDoubt: isMarkedAsDoubt || false
          };
        }
        
        // Si el answer es simple (solo valor), convertirlo a objeto
        return {
          questionId: examData.questions?.[index]?._id || `question-${index}`,
          selectedAnswer: answer,
          markedAsDoubt: isMarkedAsDoubt || false
        };
      });
    } else {
      console.log('No hay userAnswers válidos para procesar');
    }
    
    // CASO 1: Examen nuevo (sin examId)
    if (!examData.examId) {
      console.log('Creando un nuevo examen (sin ID)');
      
      // Crear un nuevo examen en ExamenResultado
      const newExam = new ExamenResultado({
        userId,
        type: examData.type,
        questions: examData.questions || [],
        userAnswers: processedUserAnswers,
        totalQuestions: examData.totalQuestions || 0,
        timeUsed: examData.timeUsed || 0,
        score: 0,
        status: examData.status || 'in_progress',
        currentQuestion: examData.currentQuestion || 0,
        timeLeft: examData.timeLeft,
        totalTime: examData.totalTime,
        markedAsDoubt: examData.markedAsDoubt || {},
        selectedAnswers: examData.selectedAnswers || {}
      });
      
      const savedExam = await newExam.save();
      console.log(`Nuevo examen creado con ID: ${savedExam._id}`);
      
      // Actualizar usuario con la referencia al examen
      await User.updateOne(
        { userId },
        { 
          $set: { 
            examProgress: {
              examId: savedExam._id,
              type: examData.type,
              currentQuestion: examData.currentQuestion || 0,
              timeLeft: examData.timeLeft,
              totalTime: examData.totalTime,
              markedAsDoubt: examData.markedAsDoubt || {},
              selectedAnswers: examData.selectedAnswers || {},
              status: examData.status || 'in_progress',
              date: new Date(),
              lastUpdated: new Date()
            }
          }
        }
      );
      
      console.log('====== FIN SAVE EXAM PROGRESS (NUEVO EXAMEN) ======');
      return res.json({
        success: true,
        message: 'Nuevo examen creado correctamente',
        examId: savedExam._id
      });
    }
    
    // CASO 2: Hay examId proporcionado - actualizar examen existente
    console.log(`Se proporcionó examId: ${examData.examId}, actualizando examen existente`);
    
    // Buscar el examen en ExamenResultado
    let existingExam = null;
    
    try {
      existingExam = await ExamenResultado.findById(examData.examId);
      
      if (!existingExam && typeof examData.examId === 'string') {
        try {
          let mongoId = new mongoose.Types.ObjectId(examData.examId);
          existingExam = await ExamenResultado.findById(mongoId);
          console.log(`Encontrado examen usando ObjectId convertido: ${mongoId}`);
        } catch (e) {
          console.log(`No se pudo convertir a ObjectId: ${e.message}`);
        }
      }
    } catch (error) {
      console.error(`Error al buscar examen: ${error.message}`);
    }
    
    // Si no encontramos el examen, intentamos crearlo
    if (!existingExam) {
      console.log(`No se encontró el examen con ID ${examData.examId}. Creando uno nuevo.`);
      
      try {
        // Crear un nuevo examen con el ID proporcionado si es posible
        existingExam = new ExamenResultado({
          _id: new mongoose.Types.ObjectId(),
          userId,
          type: examData.type || 'desconocido',
          userAnswers: processedUserAnswers,
          questions: examData.questions || [],
          totalQuestions: examData.questions?.length || 0,
          timeUsed: examData.timeUsed || 0,
          status: examData.status || 'in_progress',
          currentQuestion: examData.currentQuestion || 0,
          timeLeft: examData.timeLeft || 0,
          totalTime: examData.totalTime || 3600,
          markedAsDoubt: examData.markedAsDoubt || {},
          createdAt: new Date()
        });
        
        await existingExam.save();
        console.log(`Creado nuevo examen con ID: ${existingExam._id}`);
      } catch (e) {
        console.error(`Error al crear examen: ${e.message}`);
        return res.status(500).json({
          error: 'Error al crear examen',
          message: e.message
        });
      }
    } else {
      console.log(`Examen encontrado. ID: ${existingExam._id}, Tipo: ${existingExam.type}`);
      console.log(`Estado actual: ${existingExam.status}, Respuestas actuales: ${existingExam.userAnswers?.length || 0}`);
      
      // Actualizar el examen existente
      existingExam.userAnswers = processedUserAnswers;
      existingExam.currentQuestion = examData.currentQuestion || 0;
      existingExam.timeLeft = examData.timeLeft;
      existingExam.timeUsed = examData.timeUsed || 0;
      existingExam.markedAsDoubt = examData.markedAsDoubt || {};
      existingExam.selectedAnswers = examData.selectedAnswers || {};
      existingExam.status = examData.status || 'in_progress';
      existingExam.updatedAt = new Date();
      
      await existingExam.save();
      console.log(`Examen ${existingExam._id} actualizado correctamente`);
    }
    
    // Actualizar examProgress del usuario
    await User.updateOne(
      { userId },
      {
        $set: {
          examProgress: {
            examId: existingExam._id,
            type: existingExam.type,
            currentQuestion: examData.currentQuestion || 0,
            timeLeft: examData.timeLeft,
            totalTime: examData.totalTime,
            markedAsDoubt: examData.markedAsDoubt || {},
            selectedAnswers: examData.selectedAnswers || {},
            status: examData.status || 'in_progress',
            date: new Date(),
            lastUpdated: new Date()
          }
        }
      }
    );
    
    console.log(`Usuario ${userId} actualizado correctamente`);
    console.log('====== FIN SAVE EXAM PROGRESS (ACTUALIZACIÓN) ======');
    
    res.json({
      success: true,
      message: 'Progreso guardado correctamente',
      examId: existingExam._id
    });
    
  } catch (error) {
    console.error("ERROR EN /validate-and-save-exam-in-progress:", error);
    res.status(500).json({
      error: 'Error al guardar progreso del examen',
      message: error.message,      stack: error.stack
    });
  }
});

// Payment Routes
app.post('/create-payment-intent', async (req, res) => {
  const { userId, email, plan, amount, userName } = req.body;

  if (!userId || !email || !plan || !amount) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  const validPlans = { mensual: 999, anual: 3999 };
  if (!validPlans[plan] || validPlans[plan] !== amount) {
    return res.status(400).json({ error: 'Plan o monto inválido' });
  }

  try {
    // Mapear planes a precios de Stripe
    const priceMapping = {
      mensual: 'price_1RhSP0DtruRDObwZDrUOa8WG', // €9.99/mes
      anual: 'price_1RhSLnDtruRDObwZyPGdzKmI'    // €39.99/año
    };
    
    const priceId = priceMapping[plan];
    if (!priceId) {
      return res.status(400).json({ error: 'Plan no válido' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: 7
      },
      allow_promotion_codes: true,
      success_url: `${FRONTEND_URL}/success?userId=${userId}&plan=${plan}`,
      cancel_url: `${FRONTEND_URL}/cancel`,
      client_reference_id: userId,
      custom_fields: [
        {
          key: 'full_name',
          label: { type: 'custom', custom: 'Nombre completo' },
          type: 'text',
          optional: false
        }
      ],
      metadata: { userId, plan, email, userName: userName || userId } // Incluir nombre en metadatos
    });

    // Actualizar el usuario directamente sin esperar el webhook, incluyendo el email
    console.log(`🏦 PAYMENT INTENT: Guardando usuario ${userId} con plan ${plan} y email ${email}`);
    const savedUser = await User.findOneAndUpdate(
      { userId },
      { 
        plan,
        email, // Asegurar que el email se guarde
        $setOnInsert: { // Solo establecer estos campos si es un nuevo usuario
          examHistory: [],
          failedQuestions: []
        }
      },
      { 
        upsert: true,
        new: true // Retornar el documento actualizado
      }
    );

    console.log(`🏦 PAYMENT INTENT: Usuario ${userId} guardado correctamente:`, {
      userId: savedUser.userId,
      email: savedUser.email,
      plan: savedUser.plan,
      created: savedUser.createdAt || 'existing'
    });

    res.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error('Error al crear sesión de pago:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Webhook de Stripe para manejar eventos de pago
app.post('/stripe-webhook', async (req, res) => {
  const signature = req.headers['stripe-signature'];
  
  // Logging mejorado para debugging
  console.log('🔍 STRIPE WEBHOOK DEBUG:');
  console.log('   Body type:', typeof req.body);
  console.log('   Body is Buffer:', Buffer.isBuffer(req.body));
  console.log('   Body length:', req.body ? req.body.length : 'undefined');
  console.log('   Signature present:', !!signature);
  console.log('   STRIPE_WEBHOOK_SECRET configured:', !!process.env.STRIPE_WEBHOOK_SECRET);
  
  try {
    // Verificar que tenemos el secreto del webhook
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('❌ STRIPE_WEBHOOK_SECRET no está configurado');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }
    
    // Verificar que tenemos la firma
    if (!signature) {
      console.error('❌ No se encontró la firma de Stripe');
      return res.status(400).json({ error: 'No Stripe signature found' });
    }
    
    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log(`✅ Webhook verificado: ${event.type} - ID: ${event.id}`);

    // VERIFICACIÓN DE IDEMPOTENCIA - Evitar procesar eventos duplicados
    const eventId = event.id;
    const existingEvent = await EventLog.findOne({ eventId });
    
    if (existingEvent) {
      console.log(`⚠️ Evento ${eventId} ya procesado anteriormente, omitiendo...`);
      return res.json({ received: true, alreadyProcessed: true });
    }

    // Registrar el evento para evitar duplicados
    await EventLog.create({
      eventId: event.id,
      eventType: event.type,
      processedAt: new Date(),
      data: event.data
    });

    switch (event.type) {
      case 'checkout.session.completed':
        let session = event.data.object;
        // En algunos casos Stripe no incluye todos los campos en el evento → recuperar sesión completa
        if (!session?.metadata?.userId && !session?.client_reference_id) {
          try {
            const fetched = await stripe.checkout.sessions.retrieve(session.id, { expand: ['customer_details'] });
            if (fetched) session = fetched;
          } catch (fetchErr) {
            console.error('💳 STRIPE WEBHOOK: No se pudo recuperar la sesión completa:', fetchErr.message);
          }
        }

        // Preferir metadatos, pero añadir fallbacks robustos
        const meta = (session && session.metadata) || {};
        const userIdFromMeta = meta.userId;
        const planFromMeta = meta.plan;
        const emailFromMeta = meta.email;
        const nameFromMeta = meta.userName;
        // Nombre desde custom_fields si el usuario lo introdujo en Checkout
        let nameFromCustomField = undefined;
        try {
          if (Array.isArray(session.custom_fields)) {
            const f = session.custom_fields.find(cf => cf?.key === 'full_name');
            if (f && f.text && f.text.value) nameFromCustomField = f.text.value;
          }
        } catch(_) {}
        const fallbackEmail = (session && session.customer_details && session.customer_details.email) || emailFromMeta || userIdFromMeta;
        const fallbackUserId = userIdFromMeta || session.client_reference_id || (session.customer && String(session.customer)) || undefined;
        const userId = fallbackUserId;
        const plan = planFromMeta;
        const email = fallbackEmail;
        const userName = nameFromCustomField || nameFromMeta || userId;
        
        console.log(`💳 STRIPE WEBHOOK: Datos completos recibidos:`, {
          sessionId: session.id,
          metadata: session.metadata,
          customerId: session.customer,
          amount: session.amount_total,
          currency: session.currency,
          status: session.status
        });
        
        console.log(`Procesando pago completado para usuario ${userId}, plan: ${plan}`);
        
        // Determinar userId efectivo con fallbacks seguros
        let effectiveUserId = userId || (email ? String(email).toLowerCase() : undefined) || session.client_reference_id || (session.customer && String(session.customer)) || session.id;
        if (!effectiveUserId) {
          console.error('💳 STRIPE WEBHOOK: no se pudo determinar ningún identificador de usuario');
          break; // responderá 200 más abajo para evitar reintentos infinitos
        }
        
        // Si no se pudo determinar el plan desde metadata, obtenerlo desde la suscripción
        let finalPlan = plan;
        if (!finalPlan || !['mensual', 'anual'].includes(finalPlan)) {
          console.log(`💳 STRIPE WEBHOOK: Plan no determinado desde metadata (${plan}), obteniendo desde suscripción...`);
          
          try {
            // Obtener suscripciones del cliente
            const subscriptions = await stripe.subscriptions.list({
              customer: session.customer,
              status: 'active'
            });
            
            if (subscriptions.data.length > 0) {
              const subscription = subscriptions.data[0];
              const priceId = subscription.items.data[0]?.price?.id;
              
              // Mapear priceId a plan
              const PRICE_TO_PLAN = {
                'price_1RhSP0DtruRDObwZDrUOa8WG': 'mensual', // €9.99/mes
                'price_1RhSLnDtruRDObwZyPGdzKmI': 'anual'    // €39.99/año
              };
              
              finalPlan = PRICE_TO_PLAN[priceId];
              console.log(`💳 STRIPE WEBHOOK: Plan obtenido desde suscripción: ${finalPlan} (priceId: ${priceId})`);
            }
          } catch (subError) {
            console.error('💳 STRIPE WEBHOOK: Error obteniendo suscripción:', subError.message);
          }
        }
        
        // Validar que el plan final sea válido
        if (!finalPlan || !['mensual', 'anual'].includes(finalPlan)) {
          console.error(`💳 STRIPE WEBHOOK: Plan inválido o no determinado: ${finalPlan}. No se actualizará el usuario.`);
          break;
        }
        
        // Actualizar usuario en la base de datos
        const updatedUser = await User.findOneAndUpdate(
          { userId: effectiveUserId },
          { 
            plan: finalPlan, // Usar el plan final determinado
            email: email || effectiveUserId,
            userName: userName || effectiveUserId,
            stripeId: session.customer || undefined, // Guardar siempre el stripeId
            $setOnInsert: {
              examHistory: [],
              failedQuestions: []
            }
          },
          { upsert: true, new: true }
        );
        
        console.log(`Plan ${finalPlan} activado para usuario ${effectiveUserId} a través de webhook`);
        
        // Enviar webhook a n8n tras pago completado exitosamente
        console.log('💳 STRIPE WEBHOOK: Enviando webhook a n8n para nuevo pago');
        
        const webhookData = {
          email: email || effectiveUserId,
          nombre: userName || effectiveUserId, // Usar nombre real si está disponible
          plan: plan,
          userId: effectiveUserId,
          stripeId: session.customer || undefined,
          fechaRegistro: new Date().toISOString(),
          sessionId: session.id,
          amount: session.amount_total,
          currency: session.currency,
          reason: 'stripe_payment_completed'
        };
        
        console.log('💳 STRIPE WEBHOOK: Datos que se envían a n8n:', webhookData);
        
        // Intentar enviar webhook múltiples veces si falla
        let webhookResult = null;
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts && (!webhookResult || !webhookResult.success)) {
          attempts++;
          console.log(`💳 STRIPE WEBHOOK: Intento ${attempts}/${maxAttempts} de envío de webhook`);
          
          try {
            webhookResult = await sendWebhookToN8N(webhookData);
            if (webhookResult.success) {
              console.log(`✅ STRIPE WEBHOOK: Webhook enviado exitosamente en intento ${attempts}`);
              break;
            } else {
              console.log(`⚠️ STRIPE WEBHOOK: Intento ${attempts} falló:`, webhookResult.error);
            }
          } catch (webhookError) {
            console.error(`❌ STRIPE WEBHOOK: Error en intento ${attempts}:`, webhookError.message);
            webhookResult = { success: false, error: webhookError.message };
          }
          
          // Esperar antes del siguiente intento
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
        
        if (webhookResult && webhookResult.success) {
          console.log('✅ STRIPE WEBHOOK: Webhook enviado exitosamente después de reintentos');
        } else {
          console.error('❌ STRIPE WEBHOOK: Todos los intentos de webhook fallaron');
        }
        break;

      case 'invoice.payment_succeeded':
        try {
        const invoice = event.data.object;
        const customerId = invoice.customer;
          const customerEmail = invoice.customer_email || (invoice.customer_details && invoice.customer_details.email) || undefined;
          const customerName = invoice.customer_name || undefined;
          
          // VERIFICACIÓN DE DUPLICADOS - Evitar procesar el mismo cliente múltiples veces
          const existingCustomer = await User.findOne({ 
            $or: [
              { stripeId: customerId },
              { email: customerEmail }
            ]
          });
          
          if (existingCustomer && existingCustomer.plan === 'mensual') {
            console.log(`⚠️ INVOICE WEBHOOK: Cliente ${customerId} ya tiene plan activo, omitiendo...`);
            break;
          }
          
          // Deducir plan a partir del primer line_item
          let planFromInvoice = undefined;
          try {
            const line = Array.isArray(invoice.lines?.data) ? invoice.lines.data[0] : undefined;
            const priceId = line?.price?.id;
            const interval = line?.price?.recurring?.interval;
            if (priceId) {
              // Mapa simple de priceId a plan
              const PRICE_TO_PLAN = {
                'price_1RhSP0DtruRDObwZDrUOa8WG': 'mensual', // €9.99/mes
                'price_1RhSLnDtruRDObwZyPGdzKmI': 'anual'    // €39.99/año
              };
              planFromInvoice = PRICE_TO_PLAN[priceId];
            }
          } catch (_) {}

          // Construir un identificador efectivo
          const effectiveUserId = customerEmail || customerId;
          if (!effectiveUserId) {
            console.error('💳 INVOICE WEBHOOK: no se pudo determinar userId');
            break;
          }

          // Validar que el plan sea válido antes de actualizar
          if (!planFromInvoice || !['mensual', 'anual'].includes(planFromInvoice)) {
            console.error(`💳 INVOICE WEBHOOK: Plan inválido o no determinado: ${planFromInvoice}. No se actualizará el usuario.`);
            break;
          }

          const updatedFromInvoice = await User.findOneAndUpdate(
            { $or: [ { stripeId: customerId }, { email: customerEmail }, { userId: effectiveUserId } ] },
            {
              userId: effectiveUserId,
              email: customerEmail || effectiveUserId,
              userName: customerName || effectiveUserId,
              stripeId: customerId,
              plan: planFromInvoice, // Solo asignar si el plan es válido
              $setOnInsert: { examHistory: [], failedQuestions: [] }
            },
            { upsert: true, new: true }
          );

          console.log(`💳 INVOICE WEBHOOK: Pago exitoso registrado para ${effectiveUserId} (cliente ${customerId})`);

          const webhookDataInvoice = {
            email: updatedFromInvoice.email,
            nombre: updatedFromInvoice.userName || updatedFromInvoice.userId,
            plan: updatedFromInvoice.plan,
            userId: updatedFromInvoice.userId,
            stripeId: customerId,
            fechaRegistro: new Date().toISOString(),
            eventType: 'invoice.payment_succeeded',
            amount: invoice.total,
            currency: invoice.currency
          };

          await sendWebhookToN8N(webhookDataInvoice);
        } catch (err) {
          console.error('💳 INVOICE WEBHOOK: Error procesando pago de factura:', err.message);
        }
        break;

      case 'invoice.payment_failed':
        // Manejar fallos de pago
        const failedInvoice = event.data.object;
        const failedCustomerId = failedInvoice.customer;
        console.log(`Fallo en el pago para cliente: ${failedCustomerId}`);
        break;

      case 'customer.subscription.deleted':
        try {
          const subscription = event.data.object;
          const customerId = subscription.customer;
          
          console.log(`💳 SUBSCRIPTION DELETED: Suscripción cancelada para cliente ${customerId}`);
          
          // Eliminar usuario cuando se cancela la suscripción (ya que solo permitimos planes de pago)
          await User.findOneAndDelete({ stripeId: customerId });
          
          console.log(`✅ Usuario ${customerId} eliminado tras cancelación de suscripción`);
        } catch (err) {
          console.error('💳 SUBSCRIPTION DELETED: Error procesando cancelación:', err.message);
        }
        break;

      case 'customer.subscription.updated':
        try {
          const subscription = event.data.object;
          const customerId = subscription.customer;
          const status = subscription.status;
          
          console.log(`💳 SUBSCRIPTION UPDATED: Estado de suscripción ${status} para cliente ${customerId}`);
          
          // Solo procesar si es una activación
          if (status === 'active') {
            const existingUser = await User.findOne({ stripeId: customerId });
            if (existingUser) {
              await User.findOneAndUpdate(
                { stripeId: customerId },
                { 
                  plan: 'mensual',
                  subscriptionStatus: status,
                  subscriptionUpdatedAt: new Date()
                }
              );
              console.log(`✅ Usuario ${customerId} reactivado a plan mensual`);
            }
          }
        } catch (err) {
          console.error('💳 SUBSCRIPTION UPDATED: Error procesando actualización:', err.message);
        }
        break;

      default:
        console.log(`Evento no manejado: ${event.type}`);
    }

    // Confirmar recepción a Stripe
    console.log(`✅ Webhook procesado exitosamente: ${event.type}`);
    res.json({ received: true, eventType: event.type, eventId: event.id });
  } catch (error) {
    console.error('❌ Error en webhook:', error);
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    
    // Enviar respuesta de error apropiada
    if (error.type === 'StripeSignatureVerificationError') {
      console.error('❌ Error de verificación de firma de Stripe');
      res.status(400).json({ 
        error: 'Invalid signature',
        message: 'The webhook signature verification failed'
      });
    } else {
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  }
});

// Modificar la ruta del usuario de prueba
app.post('/create-test-user', async (req, res) => {
  try {
    // En producción, desactivar completamente esta funcionalidad
    if (isProduction) {
      return res.status(403).json({ 
        error: 'Esta funcionalidad está desactivada en el entorno de producción'
      });
    }
    
    // Buscar si ya existe el usuario de prueba
    let testUser = await User.findOne({ userId: 'test_user_1' });
    
    if (!testUser) {
      // Si no existe, crear uno nuevo pero solo en desarrollo
      testUser = new User({
        userId: 'test_user_1',
        email: 'test@example.com',
        plan: 'mensual',
        expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        examHistory: [],
        failedQuestions: [],
        role: 'user'
      });
      await testUser.save();
    } else {
      // Actualizar expiración en desarrollo
      testUser.expirationDate = new Date('2025-12-31');
      testUser.plan = 'mensual';
      await testUser.save();
    }

    res.json({ 
      message: 'Usuario de prueba configurado con éxito (solo para desarrollo)',
      userId: testUser.userId
    });
  } catch (error) {
    console.error('Error al configurar usuario de prueba:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/random-questions-contrarreloj', async (req, res) => {
  try {
    const { count, excludeImages } = req.body;
    
    // Construir query para MongoDB
    const query = excludeImages ? { image: { $exists: false } } : {};
    
    // Obtener solo las preguntas necesarias con los campos requeridos
    const questions = await ExamenCompleto.aggregate([
      { $match: query },
      { $sample: { size: count } },
      { $project: { 
        question: 1, 
        option_1: 1, 
        option_2: 1, 
        option_3: 1, 
        option_4: 1, 
        correct_answer: 1,  // Asegurarse de que este campo existe
        answer: 1,          // Compatibilidad con versiones anteriores
        image: 1,           // Incluir imágenes si existen
        exam_name: 1,
        subject: 1,
        long_answer: 1,     // Incluir long_answer
        _id: 1
      }}
    ]).exec();
    
    // Procesar el resultado para compatibilidad
    const processedQuestions = questions.map(q => {
      // Asegurarse de que se utiliza el campo de respuesta correcto
      return {
        ...q,
        answer: q.correct_answer || q.answer || "A",  // Usar campo adecuado o default a "A"
        long_answer: q.long_answer || ""  // Asegurar que long_answer esté incluido
      };
    });
    
    console.log(`Enviando ${processedQuestions.length} preguntas de examen_completos`);
    res.json(processedQuestions);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al obtener preguntas' });
  }
});

// Añadir ruta de prueba
app.get('/test', (req, res) => {
  res.json({ message: 'Servidor funcionando correctamente' });
});

// Configurar el servido de archivos estáticos para las imágenes
const preguntasPath = isProduction 
  ? path.join(__dirname, './public/preguntas') 
  : path.join(__dirname, '../frontend/public/preguntas');
console.log('Ruta de imágenes:', preguntasPath);

app.use('/preguntas', (req, res, next) => {
  if (isProduction) {
    console.log('Solicitud de imagen en producción:', req.url);
  } else {
    console.log('Solicitud de imagen en desarrollo:', req.url);
  }
  next();
}, express.static(preguntasPath));

// Agregar ruta para obtener asignaturas disponibles
app.get('/subjects', async (req, res) => {
  try {
    // Obtener las asignaturas únicas de la base de datos
    const subjects = await ExamenCompleto.distinct('subject');
    
    // Convertir a formato con id y nombre
    const formattedSubjects = subjects
      .filter(subject => subject) // Eliminar valores nulos o vacíos
      .map((subject, index) => ({
        id: subject,
        nombre: subject
      }));
    
    res.json(formattedSubjects);
  } catch (error) {
    console.error('Error al obtener asignaturas:', error);
    res.status(500).json({ error: 'Error al obtener asignaturas' });
  }
});

// Agregar ruta para crear exámenes personalizados
app.post('/create-custom-exam', async (req, res) => {
  try {
    const { numPreguntas, asignaturas, tipoPregunta } = req.body;
    
    let query = {};
    
    // Filtrar por asignaturas si se especifican
    if (asignaturas && asignaturas.length > 0) {
      query.subject = { $in: asignaturas };
    }
    
    // Filtrar por tipo de pregunta
    if (tipoPregunta === 'texto') {
      query.image = { $exists: false };
    } else if (tipoPregunta === 'imagenes') {
      query.image = { $exists: true, $ne: null };
    }
    
    // Obtener preguntas
    const questions = await ExamenCompleto.aggregate([
      { $match: query },
      { $sample: { size: Number(numPreguntas) } }
    ]);
    
    // Procesar preguntas
    const processedQuestions = questions.map(q => ({
      ...q,
      options: [q.option_1, q.option_2, q.option_3, q.option_4, q.option_5].filter(Boolean),
      image: q.image ? `/preguntas/${q.image}` : null
    }));
    
    res.json({
      questions: processedQuestions,
      examId: new mongoose.Types.ObjectId()
    });
  } catch (error) {
    console.error('Error al crear examen personalizado:', error);
    res.status(500).json({ error: 'Error al crear examen personalizado' });
  }
});

// Ruta para obtener preguntas aleatorias de examen_completos
app.post('/random-question-completos', async (req, res) => {
  try {
    console.log("Petición recibida en /random-question-completos:", req.body);
    const { count = 200, examType, asignaturas } = req.body;
    
    // Construir query base
    let query = {};
    
    // Si hay asignaturas seleccionadas, filtrar por ellas
    if (asignaturas && asignaturas.length > 0) {
      query.subject = { $in: asignaturas };
    }
    
    console.log("Query a ejecutar:", query);
    
    // Obtener preguntas aleatorias
    const questions = await ExamenCompleto.aggregate([
      { $match: query },
      { $sample: { size: parseInt(count) } },
      { $project: { 
        question: 1, 
        option_1: 1, 
        option_2: 1, 
        option_3: 1, 
        option_4: 1, 
        option_5: 1, 
        correct_answer: 1,  // Asegurarse de que este campo existe
        answer: 1,          // Compatibilidad con versiones anteriores
        image: 1,           // Incluir imágenes si existen
        exam_name: 1,
        subject: 1,
        long_answer: 1,     // Incluir la explicación larga
        _id: 1
      }}
    ]).exec();
    
    // Procesar el resultado para compatibilidad
    const processedQuestions = questions.map(q => {
      // Asegurarse de que se utiliza el campo de respuesta correcto
      return {
        ...q,
        answer: q.correct_answer || q.answer || "A",  // Usar campo adecuado o default a "A"
        long_answer: q.long_answer || null  // Asegurar que long_answer siempre esté presente
      };
    });
    
    console.log(`Enviando ${processedQuestions.length} preguntas de examen_completos`);
    res.json(processedQuestions);
  } catch (error) {
    console.error('Error al obtener preguntas aleatorias:', error);
    res.status(500).json({ error: 'Error al obtener preguntas aleatorias', message: error.message });
  }
});

// Ruta para obtener preguntas aleatorias con fotos
app.post('/random-fotos', async (req, res) => {
  try {
    const { count = 10, asignaturas } = req.body;
    
    // Construir query base
    let query = { image: { $exists: true, $ne: null } };
    
    // Si hay asignaturas seleccionadas, filtrar por ellas
    if (asignaturas && asignaturas.length > 0) {
      query.subject = { $in: asignaturas };
    }
    
    // Obtener preguntas con imágenes
    const questions = await ExamenFotos.aggregate([
      { $match: query },
      { $sample: { size: parseInt(count) } },
      { $project: { 
        question: 1, 
        option_1: 1, 
        option_2: 1, 
        option_3: 1, 
        option_4: 1, 
        option_5: 1, 
        answer: 1,
        image: 1,
        exam_name: 1,
        subject: 1,
        _id: 1
      }}
    ]);
    
    console.log(`Enviando ${questions.length} preguntas con imágenes`);
    res.json(questions);
  } catch (error) {
    console.error('Error al obtener preguntas con fotos:', error);
    res.status(500).json({ error: 'Error al obtener preguntas con fotos' });
  }
});

// Ruta para obtener preguntas aleatorias de protocolos
app.post('/random-protocolos', async (req, res) => {
  try {
    const { count = 30 } = req.body;
    
    // Obtener preguntas de protocolos
    const questions = await mongoose.connection.db
      .collection('examen_protocolos')
      .aggregate([
        { $sample: { size: parseInt(count) } },
        { $project: {
          _id: 1,
          question: 1,
          option_1: 1,
          option_2: 1,
          option_3: 1,
          option_4: 1
        }}
      ]).toArray();

    if (!questions || questions.length === 0) {
      console.error('No se encontraron preguntas de protocolos');
      return res.status(404).json({ error: 'No se encontraron preguntas de protocolos' });
    }

    console.log(`Enviando ${questions.length} preguntas de protocolos`);
    return res.json(questions);

  } catch (error) {
    console.error('Error en /random-protocolos:', error);
    return res.status(500).json({ error: 'Error al obtener preguntas de protocolos' });
  }
});

// Añadir un nuevo endpoint simplificado con más diagnóstico
app.post('/debug-save-exam', async (req, res) => {
  try {
    console.log("DATOS RECIBIDOS:", JSON.stringify(req.body, null, 2));
    
    const { userId, examType } = req.body;
    
    if (examType) {
      console.log(`=== FINALIZACIÓN DE EXAMEN DETECTADA ===`);
      console.log(`Tipo de examen recibido: ${examType}`);
      console.log(`=========================================`);
    }
    
    if (!userId) {
      return res.status(400).json({ error: 'UserId requerido' });
    }
    
    // Verificar si el usuario existe
    const user = await User.findOne({ userId });
    console.log("USUARIO ENCONTRADO:", user ? "SÍ" : "NO");
    
    // Si el usuario no existe, crear uno nuevo
    if (!user) {
      const newUser = new User({
        userId,
        email: `${userId}@simulia.com`,
        plan: 'anual',
        examHistory: [], // Inicializar array vacío
        expirationDate: new Date('2025-12-31')
      });
      
      await newUser.save();
      console.log("USUARIO CREADO");
    }
    
    res.json({ success: true, message: 'Datos recibidos correctamente' });
  } catch (error) {
    console.error("ERROR COMPLETO:", error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Endpoint simplificado para actualizar directamente el historial de exámenes
app.post('/update-exam-history', async (req, res) => {
  try {
    const { userId, examData } = req.body;
    
    if (!userId || !examData) {
      return res.status(400).json({ error: 'Se requieren userId y examData' });
    }
    
    console.log(`Actualizando historial para usuario ${userId}`);
    console.log("Datos del examen:", JSON.stringify(examData, null, 2));
    
    // Buscar al usuario
    const user = await User.findOne({ userId });
    
    if (!user) {
      console.log(`No se encontró el usuario ${userId}, creando uno nuevo...`);
      
      // Crear un nuevo usuario si no existe
      const newUser = new User({
        userId,
        email: `${userId}@temp.com`,
        plan: 'anual',
        expirationDate: new Date('2025-12-31')
      });
      
      await newUser.save();
      console.log(`Usuario ${userId} creado correctamente`);
    }
    
    // Crear un nuevo examen en la colección ExamenResultado
    const newExam = new ExamenResultado({
      userId,
      ...examData,
      date: new Date()
    });
    
    await newExam.save();
    console.log(`Examen guardado en ExamenResultado con ID: ${newExam._id}`);
    
    res.json({
      success: true,
      message: 'Examen guardado correctamente',
      examId: newExam._id
    });
    
  } catch (error) {
    console.error("ERROR EN /update-exam-history:", error);
    res.status(500).json({
      error: 'Error al actualizar el historial de exámenes',
      message: error.message,
      stack: error.stack
    });
  }
});

// Eliminada ruta de depuración /debug-user/:userId

// Ruta para obtener exámenes en progreso de un usuario
app.get('/exams-in-progress/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId es requerido' });
    }
    
    console.log(`Buscando exámenes en progreso para usuario: ${userId}`);
    
    // Buscar al usuario
    const user = await User.findOne({ userId });
    
    if (!user) {
      console.log(`Usuario ${userId} no encontrado`);
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Buscar exámenes en progreso directamente en la colección ExamenResultado
    const examsInProgress = await ExamenResultado.find({
      userId,
      status: 'in_progress'
    });
    
    console.log(`Se encontraron ${examsInProgress.length} exámenes en progreso para ${userId}`);
    
    // Preparar respuesta con información reducida para cada examen
    const formattedExams = examsInProgress.map(exam => ({
      _id: exam._id,
      type: exam.type,
      date: exam.date,
      totalQuestions: exam.totalQuestions,
      timeUsed: exam.timeUsed,
      currentQuestion: user.examProgress && user.examProgress.examId && 
                      user.examProgress.examId.toString() === exam._id.toString() ? 
                      user.examProgress.currentQuestion : exam.currentQuestion || 0,
      progress: Math.round((exam.userAnswers ? exam.userAnswers.length : 0) / exam.totalQuestions * 100)
    }));
    
    res.json({ exams: formattedExams });
    
  } catch (error) {
    console.error('Error al obtener exámenes en progreso:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
});

// Endpoint para obtener todos los exámenes de un usuario (sin filtrar por estado)
app.get('/all-exams/:userId', verifyUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    console.log(`Solicitando todos los exámenes para usuario: ${userId}`);
    
    // Buscar todos los exámenes en la colección ExamenResultado
    const exams = await ExamenResultado.find({ 
      userId
    }).sort({ date: -1 }); // Ordenar por fecha descendente (más reciente primero)
    
    console.log(`Enviando ${exams.length} exámenes para usuario ${userId}`);
    res.json(exams);
  } catch (error) {
    console.error('Error al obtener todos los exámenes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para obtener todos los exámenes (admin)
app.get('/admin/all-exams', async (req, res) => {
  try {
    // Verificar autenticación básica (esto debería ser reemplazado por un método más seguro en producción)
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    
    console.log('Solicitando todos los exámenes (admin)');
    
    // Parámetros de paginación
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 50;
    const userId = req.query.userId; // Filtro opcional por userId
    
    // Construir query
    const query = {};
    if (userId) {
      query.userId = userId;
    }
    
    // Contar total para paginación
    const total = await ExamenResultado.countDocuments(query);
    
    // Buscar exámenes con paginación
    const exams = await ExamenResultado.find(query)
      .sort({ date: -1 })
      .skip(page * limit)
      .limit(limit);
    
    console.log(`Enviando ${exams.length} exámenes (página ${page}, total: ${total})`);
    
    res.json({
      exams,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener todos los exámenes (admin):', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para actualizar la lista de preguntas sin contestar
app.post('/update-unanswered-questions', async (req, res) => {
  try {
    const { userId, action, questionIds, answeredQuestions, newUnansweredQuestions } = req.body;
    
    if (!userId || !action) {
      return res.status(400).json({ 
        error: 'Se requieren userId y action',
        message: 'Los campos userId y action son obligatorios'
      });
    }
    
    console.log(`Actualizando preguntas sin contestar para usuario ${userId}, acción: ${action}`);
    
    // Verificar que el usuario existe
    const user = await User.findOne({ userId });
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    let result = { updated: 0, removed: 0, added: 0 };
    
    // Manejar diferentes acciones directamente en la colección UnansweredQuestion
    switch (action) {
      case 'remove':
        // Eliminar preguntas específicas por ID
        if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
          return res.status(400).json({ error: 'Se requiere un array de questionIds para la acción remove' });
        }
        
        console.log(`Eliminando ${questionIds.length} preguntas sin contestar`);
        
        // Convertir IDs de string a ObjectId si es necesario
        const objectIds = questionIds.map(id => {
          try {
            return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
          } catch (e) {
            return id; // Si no se puede convertir, mantener el valor original
          }
        });
        
        // Eliminar directamente de la colección
        const deleteResult = await UnansweredQuestion.deleteMany({
          userId,
          questionId: { $in: objectIds }
        });
        
        result.removed = deleteResult.deletedCount || 0;
        console.log(`Se eliminaron ${result.removed} preguntas sin contestar`);
        break;
        
      case 'clear':
        // Limpiar todas las preguntas sin contestar del usuario
        const clearResult = await UnansweredQuestion.deleteMany({ userId });
        result.removed = clearResult.deletedCount || 0;
        console.log(`Se eliminaron todas las preguntas sin contestar (${result.removed})`);
        break;
        
      case 'mark-as-answered':
        // Marcar preguntas como respondidas (eliminarlas)
        if (!answeredQuestions || !Array.isArray(answeredQuestions) || answeredQuestions.length === 0) {
          return res.status(400).json({ error: 'Se requiere un array de answeredQuestions para la acción mark-as-answered' });
        }
        
        console.log(`Marcando ${answeredQuestions.length} preguntas como contestadas`);
        
        // Extraer los IDs de las preguntas contestadas
        const answeredIds = answeredQuestions
          .filter(q => q.questionId)
          .map(q => {
            try {
              // Convertir a ObjectId si es posible
              return new mongoose.Types.ObjectId(q.questionId);
            } catch (e) {
              console.log(`Error al convertir ID ${q.questionId}: ${e.message}`);
              return q.questionId; // Mantener como está si no se puede convertir
            }
          });
        
        // Eliminar preguntas contestadas
        if (answeredIds.length > 0) {
          const markResult = await UnansweredQuestion.deleteMany({
            userId,
            questionId: { $in: answeredIds }
          });
          
          result.removed = markResult.deletedCount || 0;
          console.log(`Se eliminaron ${result.removed} preguntas marcadas como contestadas`);
        } else {
          console.log('No se proporcionaron IDs válidos para marcar como contestadas');
        }
        break;
      
      case 'add':
        // Añadir nuevas preguntas sin contestar
        if (!newUnansweredQuestions || !Array.isArray(newUnansweredQuestions) || newUnansweredQuestions.length === 0) {
          return res.status(400).json({ error: 'Se requiere un array de newUnansweredQuestions para la acción add' });
        }
        
        console.log(`Añadiendo ${newUnansweredQuestions.length} preguntas sin contestar`);
        
        // Verificar que todas tengan un ID
        const validQuestions = newUnansweredQuestions.filter(q => {
          if (!q.questionId) {
            console.log('ADVERTENCIA: Pregunta sin ID válido descartada');
            return false;
          }
          return true;
        });
        
        if (validQuestions.length < newUnansweredQuestions.length) {
          console.log(`Se descartaron ${newUnansweredQuestions.length - validQuestions.length} preguntas sin ID válido`);
        }
        
        // Verificar duplicados desde la base de datos
        const idsToCheck = validQuestions.map(q => q.questionId.toString());
        
        const existingInDB = await UnansweredQuestion.find({
          userId,
          questionId: { $in: idsToCheck.map(id => new mongoose.Types.ObjectId(id)) }
        }, { questionId: 1 });
        
        // Crear un mapa para búsqueda eficiente
        const existingMap = {};
        existingInDB.forEach(item => {
          existingMap[item.questionId.toString()] = true;
        });
        
        // Filtrar duplicados
        const uniqueQuestions = validQuestions.filter(q => {
          const id = q.questionId.toString();
          if (existingMap[id]) {
            console.log(`Pregunta ${id} ya existe en la BD, omitiendo`);
            return false;
          }
          return true;
        });
        
        console.log(`Después de filtrar duplicados, se añadirán ${uniqueQuestions.length} preguntas`);
        
        // Preparar documentos para insertar
        if (uniqueQuestions.length > 0) {
          const docsToInsert = uniqueQuestions.map(q => {
            // Asegurar que questionId sea un ObjectId válido
            let questionId;
            try {
              questionId = mongoose.Types.ObjectId.isValid(q.questionId)
                ? new mongoose.Types.ObjectId(q.questionId.toString())
                : q.questionId;
            } catch (e) {
              console.log(`Error al convertir questionId ${q.questionId}: ${e.message}`);
              questionId = q.questionId;
            }
            
            return {
              userId,
              questionId: questionId,
              subject: q.subject || q.questionData?.subject || 'General',
              questionData: q.questionData || {},
              examId: q.examId ? new mongoose.Types.ObjectId(q.examId) : undefined,
              lastSeen: new Date(),
              needsReview: true,
              markedAsDoubt: q.markedAsDoubt || false
            };
          });
          
          // Usar bulkWrite con updateOne y upsert:true para evitar duplicados
          const bulkOps = docsToInsert.map(doc => ({
            updateOne: {
              filter: { 
                userId: doc.userId, 
                questionId: doc.questionId 
              },
              update: { 
                $set: doc,
                $setOnInsert: { createdAt: new Date() } // Solo se establece al crear
              },
              upsert: true
            }
          }));
          
          try {
            const bulkResult = await UnansweredQuestion.bulkWrite(bulkOps, { ordered: false });
            result.added = bulkResult.upsertedCount || 0;
            result.updated = bulkResult.modifiedCount || 0;
            console.log(`Operación completada: ${result.added} nuevas, ${result.updated} actualizadas, ${existingInDB.length} ya existían`);
          } catch (bulkError) {
            console.error('Error al realizar operación masiva:', bulkError);
            // Si hay mensaje detallado, mostrar información adicional
            if (bulkError.writeErrors) {
              const duplicates = bulkError.writeErrors.filter(e => e.code === 11000).length;
              console.log(`Errores por duplicados: ${duplicates}`);
              console.log(`Otros errores de escritura: ${bulkError.writeErrors.length - duplicates}`);
            }
          }
        }
        break;
        
      default:
        return res.status(400).json({ error: `Acción no reconocida: ${action}` });
    }
    
    // Contar cuántas preguntas sin contestar quedan
    const remaining = await UnansweredQuestion.countDocuments({ userId });
    
    // Responder con el resultado
    res.json({
      message: 'Preguntas sin contestar actualizadas con éxito',
      result,
      remaining
    });
    
  } catch (error) {
    console.error('Error al actualizar preguntas sin contestar:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
});

// Ruta para obtener estadísticas completas del usuario (para el chatbot)
app.get('/user-stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verificar que el usuario existe
    const user = await User.findOne({ userId });
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    console.log(`Obteniendo estadísticas completas para usuario: ${userId}`);
    
    // Obtener todos los exámenes completados
    const completedExams = await ExamenResultado.find({ 
      userId, 
      status: 'completed' 
    }).sort({ date: -1 });
    
    // Calcular estadísticas generales
    const totalExams = completedExams.length;
    const totalQuestions = completedExams.reduce((sum, exam) => sum + (exam.totalQuestions || 0), 0);
    const totalCorrect = completedExams.reduce((sum, exam) => sum + (exam.correct || 0), 0);
    const totalIncorrect = completedExams.reduce((sum, exam) => sum + (exam.incorrect || 0), 0);
    const averageScore = totalExams > 0 
      ? completedExams.reduce((sum, exam) => sum + (exam.score || 0), 0) / totalExams 
      : 0;
    
    // Calcular errores por asignatura
    const errorsBySubject = {};
    completedExams.forEach(exam => {
      if (exam.userAnswers && Array.isArray(exam.userAnswers)) {
        exam.userAnswers.forEach((userAnswer) => {
          const subject = userAnswer.questionData?.subject || 'General';
          if (subject && subject !== 'undefined' && subject !== 'test' && subject !== 'Test' && subject !== 'ERROR' && subject !== 'Error' && subject !== 'null') {
            const isCorrect = userAnswer.isCorrect === true;
            const hasAnswered = userAnswer.selectedAnswer !== undefined && userAnswer.selectedAnswer !== null && userAnswer.selectedAnswer !== '';
            
            if (hasAnswered && !isCorrect) {
              if (!errorsBySubject[subject]) {
                errorsBySubject[subject] = { errors: 0, total: 0 };
              }
              errorsBySubject[subject].errors++;
            }
            
            // Contar total de preguntas por asignatura
            if (!errorsBySubject[subject]) {
              errorsBySubject[subject] = { errors: 0, total: 0 };
            }
            errorsBySubject[subject].total++;
          }
        });
      }
    });
    
    // Convertir a array y calcular porcentajes
    const subjectStats = Object.entries(errorsBySubject)
      .map(([subject, data]) => ({
        subject,
        errors: data.errors,
        total: data.total,
        errorRate: data.total > 0 ? ((data.errors / data.total) * 100).toFixed(1) : 0,
        successRate: data.total > 0 ? (((data.total - data.errors) / data.total) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.errors - a.errors); // Ordenar por cantidad de errores
    
    // Obtener las asignaturas con más errores (top 3)
    const worstSubjects = subjectStats.slice(0, 3);
    
    // Obtener estadísticas de preguntas falladas
    const failedQuestionsCount = user.failedQuestions?.length || 0;
    
    // Obtener estadísticas de preguntas sin contestar
    const unansweredCount = await UnansweredQuestion.countDocuments({ userId });
    
    // Estructurar respuesta
    const stats = {
      general: {
        totalExams,
        totalQuestions,
        totalCorrect,
        totalIncorrect,
        averageScore: averageScore.toFixed(2),
        successRate: totalQuestions > 0 ? (((totalCorrect / totalQuestions) * 100).toFixed(1)) : 0
      },
      bySubject: subjectStats,
      worstSubjects: worstSubjects.map(s => ({
        subject: s.subject,
        errors: s.errors,
        errorRate: s.errorRate
      })),
      failedQuestions: failedQuestionsCount,
      unansweredQuestions: unansweredCount,
      lastExamDate: completedExams.length > 0 ? completedExams[0].date : null
    };
    
    res.json(stats);
    
  } catch (error) {
    console.error('Error al obtener estadísticas del usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// Ruta para obtener estadísticas de preguntas sin contestar
app.get('/unanswered-stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verificar que el usuario existe
    const user = await User.findOne({ userId });
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    console.log(`Obteniendo estadísticas de preguntas sin contestar para usuario: ${userId}`);
    
    // Contar total de preguntas sin contestar en la nueva colección
    const totalCount = await UnansweredQuestion.countDocuments({ userId });
    
    if (totalCount === 0) {
      console.log(`El usuario ${userId} no tiene preguntas sin contestar registradas`);
      return res.json({ 
        totalQuestions: 0,
        bySubject: [],
        markedAsDoubt: 0,
        withLongAnswer: 0,
        message: 'No hay preguntas sin contestar'
      });
    }
    
    // Contar preguntas marcadas como duda
    const markedAsDoubtCount = await UnansweredQuestion.countDocuments({ 
      userId, 
      markedAsDoubt: true 
    });
    
    // Contar preguntas con explicación larga
    const withLongAnswer = await UnansweredQuestion.countDocuments({ 
      userId, 
      'questionData.long_answer': { $exists: true, $ne: '', $ne: null } 
    });
    
    // Agregar por asignatura
    const subjectStats = await UnansweredQuestion.aggregate([
      { $match: { userId } },
      { $group: {
        _id: { $ifNull: ['$subject', '$questionData.subject'] },
        count: { $sum: 1 }
      }},
      { $project: { 
        _id: 0,
        subject: { $ifNull: ['$_id', 'Sin asignatura'] },
        count: 1
      }},
      { $sort: { count: -1 } }
    ]);
    
    // Encontrar fecha más reciente
    const latestQuestion = await UnansweredQuestion.findOne(
      { userId },
      { lastSeen: 1 }
    ).sort({ lastSeen: -1 });
    
    const mostRecentDate = latestQuestion ? latestQuestion.lastSeen : null;
    
    // Estructurar estadísticas
    const stats = {
      totalQuestions: totalCount,
      bySubject: subjectStats,
      markedAsDoubt: markedAsDoubtCount,
      withLongAnswer,
      mostRecentDate
    };
    
    res.json(stats);
    
  } catch (error) {
    console.error('Error al obtener estadísticas de preguntas sin contestar:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// Ruta para migrar preguntas sin contestar del modelo User a la colección UnansweredQuestion
app.post('/admin/migrate-unanswered-questions', async (req, res) => {
  try {
    // Verificar credenciales de administrador (simplificado para este ejemplo)
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    
    console.log('=== INICIANDO MIGRACIÓN DE PREGUNTAS SIN CONTESTAR ===');
    
    // Contador de usuarios y preguntas procesadas
    let totalUsers = 0;
    let totalQuestions = 0;
    let migratedQuestions = 0;
    let skippedQuestions = 0;
    let errorQuestions = 0;
    
    // Buscar todos los usuarios con preguntas sin contestar
    const users = await User.find({ 
      unansweredQuestions: { $exists: true, $ne: [] }
    });
    
    totalUsers = users.length;
    console.log(`Se encontraron ${totalUsers} usuarios con preguntas sin contestar para migrar`);
    
    // Para cada usuario, procesar sus preguntas sin contestar
    for (const user of users) {
      // Verificar que el usuario tiene array de preguntas sin contestar
      if (!user.unansweredQuestions || !Array.isArray(user.unansweredQuestions)) {
        console.log(`Usuario ${user.userId} no tiene array válido de preguntas sin contestar, omitiendo`);
        continue;
      }
      
      console.log(`Procesando ${user.unansweredQuestions.length} preguntas sin contestar para usuario ${user.userId}`);
      totalQuestions += user.unansweredQuestions.length;
      
      // Filtrar preguntas sin ID, que no son válidas
      const validQuestions = user.unansweredQuestions.filter(q => q.questionId);
      
      if (validQuestions.length < user.unansweredQuestions.length) {
        const invalid = user.unansweredQuestions.length - validQuestions.length;
        console.log(`Se filtraron ${invalid} preguntas sin ID válido`);
        skippedQuestions += invalid;
      }
      
      // Verificar duplicados contra la colección UnansweredQuestion
      const existingQuestions = await UnansweredQuestion.find({
        userId: user.userId,
        questionId: { 
          $in: validQuestions.map(q => 
            new mongoose.Types.ObjectId(q.questionId.toString())
          )
        }
      }, { questionId: 1 });
      
      // Crear mapa para verificación rápida
      const existingMap = {};
      existingQuestions.forEach(q => {
        existingMap[q.questionId.toString()] = true;
      });
      
      // Filtrar preguntas ya existentes en la colección
      const questionsToMigrate = validQuestions.filter(q => {
        const id = q.questionId.toString();
        if (existingMap[id]) {
          console.log(`Pregunta ${id} ya existe en la colección para usuario ${user.userId}, omitiendo`);
          skippedQuestions++;
          return false;
        }
        return true;
      });
      
      if (questionsToMigrate.length === 0) {
        console.log(`No hay preguntas nuevas para migrar para usuario ${user.userId}`);
        continue;
      }
      
      // Preparar objetos para inserción
      const docsToInsert = questionsToMigrate.map(q => ({
        userId: user.userId,
        questionId: new mongoose.Types.ObjectId(q.questionId.toString()),
        subject: q.subject || q.questionData?.subject || 'General',
        questionData: q.questionData || {},
        examId: q.examId ? new mongoose.Types.ObjectId(q.examId.toString()) : undefined,
        lastSeen: q.lastSeen || new Date(),
        needsReview: q.needsReview || true,
        markedAsDoubt: q.markedAsDoubt || false,
        createdAt: new Date()
      }));
      
      // Usar bulkWrite con updateOne y upsert para evitar duplicados
      const bulkOps = docsToInsert.map(doc => ({
        updateOne: {
          filter: { 
            userId: doc.userId, 
            questionId: doc.questionId 
          },
          update: { $set: doc },
          upsert: true
        }
      }));
      
      try {
        const bulkResult = await UnansweredQuestion.bulkWrite(bulkOps);
        const newCount = bulkResult.upsertedCount || 0;
        const updatedCount = bulkResult.modifiedCount || 0;
        console.log(`Migración para usuario ${user.userId}: ${newCount} nuevas, ${updatedCount} actualizadas`);
        migratedQuestions += newCount + updatedCount;
      } catch (bulkError) {
        console.error(`Error al migrar preguntas para ${user.userId}:`, bulkError.message);
        errorQuestions += docsToInsert.length;
        if (bulkError.writeErrors) {
          console.log(`Errores de escritura: ${bulkError.writeErrors.length}`);
        }
      }
    }
    
    console.log('=== RESUMEN DE MIGRACIÓN ===');
    console.log(`Total de usuarios procesados: ${totalUsers}`);
    console.log(`Total de preguntas encontradas: ${totalQuestions}`);
    console.log(`Preguntas migradas con éxito: ${migratedQuestions}`);
    console.log(`Preguntas omitidas (duplicados/inválidas): ${skippedQuestions}`);
    console.log(`Preguntas con error: ${errorQuestions}`);
    
    // Devolver resultado
    res.json({
      success: true,
      stats: {
        totalUsers,
        totalQuestions,
        migratedQuestions,
        skippedQuestions,
        errorQuestions
      },
      message: 'Migración completada'
    });
    
  } catch (error) {
    console.error('Error en la migración de preguntas sin contestar:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// Start Server
const PORT = process.env.PORT || 5001;

// Función para encontrar un puerto disponible
const findAvailablePort = async (startPort) => {
  const net = require('net');
  
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Si el puerto está ocupado, intentar con el siguiente
        findAvailablePort(startPort + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
};

// En producción, servir la aplicación React compilada
if (isProduction) {
  // Servir archivos estáticos desde la carpeta build
  const buildPath = path.join(__dirname, '../frontend/build');
  app.use(express.static(buildPath));
  
  // Para cualquier ruta no definida, servir el index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
  
  console.log('Configurado para servir aplicación React en producción');
}

// Iniciar servidor con puerto automático
findAvailablePort(PORT).then(availablePort => {
  app.listen(availablePort, () => {
    console.log(`Servidor escuchando en el puerto ${availablePort}`);
    if (availablePort !== PORT) {
      console.log(`⚠️  Puerto ${PORT} ocupado, usando puerto ${availablePort}`);
    }
    if (isProduction) {
      console.log('Modo: PRODUCCIÓN');
    } else {
      console.log('Modo: DESARROLLO');
    }
    // Programar job básico (cada ~24h) para recordatorios de práctica
    try {
      const { processInactiveUsersForReminders } = require('./services/notificationService');
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      setInterval(() => {
        console.log('⏰ Ejecutando job de recordatorios...');
        processInactiveUsersForReminders().catch(err => console.error('Job recordatorios error:', err.message));
      }, ONE_DAY_MS);
      // Primera ejecución diferida
      setTimeout(() => processInactiveUsersForReminders().catch(() => {}), 15000);
    } catch (e) {
      console.error('No se pudo iniciar el job de recordatorios:', e.message);
    }
  });
}).catch(error => {
  console.error('Error al iniciar servidor:', error);
  process.exit(1);
});


