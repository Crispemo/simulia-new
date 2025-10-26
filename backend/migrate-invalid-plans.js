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

// Función para migrar usuarios con planes inválidos
const migrateInvalidPlans = async () => {
  console.log('🔄 Iniciando migración de planes inválidos...');
  
  try {
    // Buscar usuarios con planes inválidos o sin plan
    const invalidUsers = await User.find({
      $or: [
        { plan: { $in: ['free', 'gratuito'] } },
        { plan: { $exists: false } },
        { plan: null }
      ]
    });
    
    console.log(`📊 Encontrados ${invalidUsers.length} usuarios con planes inválidos`);
    
    if (invalidUsers.length === 0) {
      console.log('✅ No hay usuarios con planes inválidos');
      return;
    }
    
    let migrated = 0;
    let deleted = 0;
    
    for (const user of invalidUsers) {
      try {
        console.log(`🔄 Procesando usuario: ${user.email || user.userId} (plan actual: ${user.plan})`);
        
        // Si el usuario tiene stripeId, mantener plan null hasta que se determine el plan correcto
        if (user.stripeId) {
          await User.findByIdAndUpdate(user._id, {
            plan: null // Mantener null hasta determinar el plan correcto
          });
          migrated++;
          console.log(`✅ Plan establecido a null para usuario con stripeId: ${user.email || user.userId}`);
        } else {
          // Si no tiene stripeId, eliminar el usuario (no debería existir sin suscripción)
          await User.findByIdAndDelete(user._id);
          deleted++;
          console.log(`🗑️ Eliminado usuario sin suscripción: ${user.email || user.userId}`);
        }
      } catch (error) {
        console.error(`❌ Error procesando usuario ${user._id}:`, error.message);
      }
    }
    
    console.log('\n📈 Resumen de migración:');
    console.log(`✅ Usuarios migrados: ${migrated}`);
    console.log(`🗑️ Usuarios eliminados: ${deleted}`);
    
  } catch (error) {
    console.error('❌ Error en migración:', error);
  }
};

// Función para validar la integridad de los datos
const validateDataIntegrity = async () => {
  console.log('🔍 Validando integridad de datos...');
  
  try {
    // Contar usuarios por plan
    const planCounts = await User.aggregate([
      { $group: { _id: '$plan', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n📊 Distribución de planes:');
    planCounts.forEach(plan => {
      console.log(`  ${plan._id}: ${plan.count} usuarios`);
    });
    
    // Verificar usuarios sin stripeId
    const usersWithoutStripeId = await User.countDocuments({
      stripeId: { $exists: false }
    });
    
    // Verificar usuarios con plan null
    const usersWithNullPlan = await User.countDocuments({
      plan: null
    });
    
    console.log(`\n⚠️ Usuarios sin stripeId: ${usersWithoutStripeId}`);
    console.log(`⚠️ Usuarios con plan null: ${usersWithNullPlan}`);
    
    // Verificar usuarios duplicados por email
    const duplicateEmails = await User.aggregate([
      { $group: { _id: '$email', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);
    
    if (duplicateEmails.length > 0) {
      console.log(`\n⚠️ Emails duplicados encontrados: ${duplicateEmails.length}`);
      duplicateEmails.forEach(dup => {
        console.log(`  ${dup._id}: ${dup.count} usuarios`);
      });
    } else {
      console.log('\n✅ No se encontraron emails duplicados');
    }
    
  } catch (error) {
    console.error('❌ Error en validación:', error);
  }
};

// Función principal
const main = async () => {
  console.log('🚀 Iniciando migración de planes inválidos');
  console.log('==========================================');
  
  await connectDB();
  
  // Migrar planes inválidos
  await migrateInvalidPlans();
  
  // Validar integridad
  await validateDataIntegrity();
  
  console.log('\n✅ Migración completada');
  process.exit(0);
};

// Ejecutar si se llama directamente
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
}

module.exports = { migrateInvalidPlans, validateDataIntegrity };
