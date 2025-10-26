#!/usr/bin/env node

const { migrateInvalidPlans, validateDataIntegrity } = require('./migrate-invalid-plans');
const { syncUsersFromStripe, cleanOrphanedUsers } = require('./sync-stripe-mongodb');
const { cleanupInvalidUsers, cleanupInvalidEmailLogs, validateConsistency } = require('./cleanup-invalid-users');
const { verifyNoFreePlans, verifyPlanDistribution, verifyEmailConsistency } = require('./verify-no-free-plans');

const main = async () => {
  console.log('🚀 INICIANDO REPARACIÓN COMPLETA DE SINCRONIZACIÓN');
  console.log('==================================================');
  console.log('Este script va a:');
  console.log('1. Limpiar usuarios con planes inválidos y correos incorrectos');
  console.log('2. Migrar usuarios con planes inválidos (free/gratuito)');
  console.log('3. Sincronizar usuarios entre Stripe y MongoDB');
  console.log('4. Limpiar usuarios huérfanos');
  console.log('5. Validar la integridad de los datos');
  console.log('');
  
  try {
    // Paso 1: Limpiar usuarios con planes inválidos y correos incorrectos
    console.log('📋 PASO 1: Limpiando usuarios con planes inválidos...');
    await cleanupInvalidUsers();
    console.log('✅ Paso 1 completado\n');
    
    // Paso 2: Limpiar logs de email incorrectos
    console.log('📋 PASO 2: Limpiando logs de email incorrectos...');
    await cleanupInvalidEmailLogs();
    console.log('✅ Paso 2 completado\n');
    
    // Paso 3: Migrar planes inválidos restantes
    console.log('📋 PASO 3: Migrando planes inválidos restantes...');
    await migrateInvalidPlans();
    console.log('✅ Paso 3 completado\n');
    
    // Paso 4: Sincronizar desde Stripe
    console.log('📋 PASO 4: Sincronizando desde Stripe...');
    await syncUsersFromStripe();
    console.log('✅ Paso 4 completado\n');
    
    // Paso 5: Limpiar usuarios huérfanos
    console.log('📋 PASO 5: Limpiando usuarios huérfanos...');
    await cleanOrphanedUsers();
    console.log('✅ Paso 5 completado\n');
    
    // Paso 6: Validar integridad
    console.log('📋 PASO 6: Validando integridad de datos...');
    await validateDataIntegrity();
    console.log('✅ Paso 6 completado\n');
    
    // Paso 7: Validar consistencia final
    console.log('📋 PASO 7: Validando consistencia final...');
    await validateConsistency();
    console.log('✅ Paso 7 completado\n');
    
    // Paso 8: Verificar que no existan planes "free"
    console.log('📋 PASO 8: Verificando que no existan planes "free"...');
    const noFreePlans = await verifyNoFreePlans();
    if (!noFreePlans) {
      throw new Error('Se encontraron planes "free" en la base de datos');
    }
    console.log('✅ Paso 8 completado\n');
    
    // Paso 9: Verificar distribución de planes
    console.log('📋 PASO 9: Verificando distribución de planes...');
    const validDistribution = await verifyPlanDistribution();
    if (!validDistribution) {
      throw new Error('Se encontraron planes inválidos en la base de datos');
    }
    console.log('✅ Paso 9 completado\n');
    
    // Paso 10: Verificar consistencia de correos
    console.log('📋 PASO 10: Verificando consistencia de correos...');
    const emailConsistency = await verifyEmailConsistency();
    if (!emailConsistency) {
      throw new Error('Se encontraron inconsistencias en los correos');
    }
    console.log('✅ Paso 10 completado\n');
    
    console.log('🎉 REPARACIÓN COMPLETADA EXITOSAMENTE');
    console.log('=====================================');
    console.log('✅ Se han eliminado usuarios con planes inválidos');
    console.log('✅ Se han limpiado correos de bienvenida incorrectos');
    console.log('✅ NO EXISTEN planes "free" en la base de datos');
    console.log('✅ Solo existen planes válidos (mensual/anual) o null');
    console.log('✅ La sincronización entre Stripe y MongoDB está corregida');
    console.log('✅ Se han eliminado usuarios huérfanos');
    console.log('✅ Los datos están validados y coherentes');
    console.log('✅ Verificación completa: NO HAY PLANES "FREE"');
    
  } catch (error) {
    console.error('❌ Error durante la reparación:', error);
    process.exit(1);
  }
};

// Ejecutar si se llama directamente
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
}

module.exports = { main };
