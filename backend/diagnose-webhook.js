#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

async function diagnoseWebhook() {
  console.log('🔍 DIAGNÓSTICO DEL WEBHOOK DE STRIPE');
  console.log('=====================================');
  
  // Verificar variables de entorno
  console.log('\n📋 Variables de entorno:');
  console.log('   STRIPE_SECRET:', process.env.STRIPE_SECRET ? '✅ Configurado' : '❌ No configurado');
  console.log('   STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET ? '✅ Configurado' : '❌ No configurado');
  console.log('   MONGODB_URI:', process.env.MONGODB_URI ? '✅ Configurado' : '❌ No configurado');
  console.log('   NODE_ENV:', process.env.NODE_ENV || 'No configurado');
  
  // Verificar URL del webhook
  const webhookUrl = process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/stripe-webhook` : 'https://backend-production-cc6b.up.railway.app/stripe-webhook';
  console.log('\n🌐 URL del webhook:', webhookUrl);
  
  // Probar conectividad
  console.log('\n🔗 Probando conectividad...');
  try {
    const response = await axios.get(webhookUrl.replace('/stripe-webhook', '/'), { timeout: 10000 });
    console.log('   ✅ Servidor accesible (status:', response.status, ')');
  } catch (error) {
    console.log('   ❌ Servidor no accesible:', error.message);
  }
  
  // Probar endpoint del webhook
  console.log('\n🧪 Probando endpoint del webhook...');
  try {
    const testPayload = { test: 'diagnostic' };
    const response = await axios.post(webhookUrl, testPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': 'test-signature'
      },
      timeout: 10000
    });
    console.log('   ✅ Endpoint responde (status:', response.status, ')');
    console.log('   📄 Respuesta:', response.data);
  } catch (error) {
    console.log('   ❌ Endpoint no responde correctamente:');
    if (error.response) {
      console.log('      Status:', error.response.status);
      console.log('      Data:', error.response.data);
    } else {
      console.log('      Error:', error.message);
    }
  }
  
  console.log('\n📝 Recomendaciones:');
  console.log('1. Verificar que STRIPE_WEBHOOK_SECRET esté configurado correctamente');
  console.log('2. Verificar que la URL del webhook en Stripe sea:', webhookUrl);
  console.log('3. Verificar que el servidor esté ejecutándose y accesible');
  console.log('4. Revisar los logs del servidor para errores específicos');
}

// Ejecutar diagnóstico
diagnoseWebhook().catch(console.error);
