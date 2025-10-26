#!/usr/bin/env node

const mongoose = require('mongoose');
const User = require('./models/User');

// Conectar a MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  }
};

// Función principal
const main = async () => {
  console.log('🔍 VERIFICACIÓN RÁPIDA: ¿Existen planes "free"?');
  console.log('===============================================');
  
  await connectDB();
  
  try {
    // Buscar usuarios con plan "free" o "gratuito"
    const usersWithFreePlan = await User.find({
      plan: { $in: ['free', 'gratuito'] }
    });
    
    if (usersWithFreePlan.length > 0) {
      console.log(`❌ ERROR: Se encontraron ${usersWithFreePlan.length} usuarios con plan "free" o "gratuito":`);
      usersWithFreePlan.forEach(user => {
        console.log(`  - ${user.email || user.userId}: plan="${user.plan}"`);
      });
      console.log('\n⚠️ Esto indica que algo ha fallado en el proceso.');
      console.log('💡 Ejecuta: node fix-user-sync.js para corregir');
      process.exit(1);
    } else {
      console.log('✅ CORRECTO: No se encontraron usuarios con plan "free" o "gratuito"');
      console.log('✅ El sistema está funcionando correctamente');
    }
    
    // Mostrar distribución de planes
    const planCounts = await User.aggregate([
      { $group: { _id: '$plan', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n📊 Distribución actual de planes:');
    planCounts.forEach(plan => {
      const planName = plan._id || 'null';
      console.log(`  ${planName}: ${plan.count} usuarios`);
    });
    
  } catch (error) {
    console.error('❌ Error verificando planes:', error);
    process.exit(1);
  }
  
  process.exit(0);
};

// Ejecutar si se llama directamente
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
}

module.exports = { main };
