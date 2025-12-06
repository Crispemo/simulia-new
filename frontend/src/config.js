// URLs de la API - CONFIGURACIÓN ROBUSTA
let API_URL;

// Detectar si estamos en producción de forma robusta
const isProduction = typeof window !== 'undefined' && 
  (window.location.hostname === 'www.simulia.es' || 
   window.location.hostname === 'simulia.es' ||
   window.location.protocol === 'https:') ||
  process.env.NODE_ENV === 'production';

if (isProduction) {
  API_URL = 'https://social-emmi-simulia-845ca5f1.koyeb.app';
  console.log('🔧 CONFIG DEBUG - PRODUCCIÓN DETECTADA - Usando Koyeb');
} else {
  API_URL = 'http://localhost:5001';
  console.log('🔧 CONFIG DEBUG - DESARROLLO DETECTADO - Usando localhost:5001');
}

console.log('🔧 CONFIG DEBUG - NODE_ENV:', process.env.NODE_ENV);
console.log('🔧 CONFIG DEBUG - hostname:', typeof window !== 'undefined' ? window.location.hostname : 'undefined');
console.log('🔧 CONFIG DEBUG - protocol:', typeof window !== 'undefined' ? window.location.protocol : 'undefined');
console.log('🔧 CONFIG DEBUG - API_URL final:', API_URL);
console.log('🔧 CONFIG DEBUG - isProduction:', isProduction);

const FRONTEND_URL = process.env.NODE_ENV === 'production' 
  ? 'https://www.simulia.es' 
  : (process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000');
const API_BASE_URL = API_URL;

// Configuración de la aplicación
const APP_CONFIG = {
  appName: 'Simulia',
  companyName: 'Simulia EIR',
  contactEmail: 'simuliaproject@simulia.es',
  isProduction: process.env.NODE_ENV === 'production'
};

// Configuración de Stripe
const STRIPE_CONFIG = {
  publishableKey: process.env.NODE_ENV === 'production' 
    ? 'pk_live_51Q2dqsDtruRDObwZjsvg14yJFl2hvXeun5u1GzI0gkSkHiaZ2UuhDJvueK1ViFpcvrlWh92ll7Mg07JOHXhN1ntY00MowgQqp8'
    : 'pk_test_51Q2dqsDtruRDObwZk7IggA5cWhnA0XiX9ZfVSFbJktboFf4iDYjlQaCDSeziOHKykQmmrGRwND5fbVZNZO1mY6CW00kOjeSCVA'
};

// Planes de suscripción
const SUBSCRIPTION_PLANS = {
  mensual: { price: 999, name: 'Explora sin presión', duration: '1 mes' },
  anual: { price: 3999, name: 'Voy a por la plaza', duration: '12 meses' }
};

// Exportar configuración
export {
  API_URL,
  FRONTEND_URL,
  API_BASE_URL,
  APP_CONFIG,
  STRIPE_CONFIG,
  SUBSCRIPTION_PLANS
}; 







