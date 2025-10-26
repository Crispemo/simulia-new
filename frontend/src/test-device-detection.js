// Script de prueba para verificar la detección de dispositivos
// Ejecutar en la consola del navegador

import { getDeviceInfo, getAuthMethod, isMobileDevice } from './utils/deviceDetection.js';

console.log('🧪 PRUEBA DE DETECCIÓN DE DISPOSITIVOS');
console.log('=====================================');

try {
  const deviceInfo = getDeviceInfo();
  const authMethod = getAuthMethod();
  const isMobile = isMobileDevice();
  
  console.log('📱 Información del dispositivo:');
  console.log(deviceInfo);
  
  console.log('\n🔐 Método de autenticación:');
  console.log(authMethod);
  
  console.log('\n📱 ¿Es móvil?');
  console.log(isMobile);
  
  console.log('\n🔍 Detalles adicionales:');
  console.log('User Agent:', navigator.userAgent);
  console.log('Platform:', navigator.platform);
  console.log('Max Touch Points:', navigator.maxTouchPoints);
  console.log('Screen Size:', `${window.innerWidth}x${window.innerHeight}`);
  console.log('Has Touch:', 'ontouchstart' in window);
  
} catch (error) {
  console.error('❌ Error en la prueba:', error);
}

