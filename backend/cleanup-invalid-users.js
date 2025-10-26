const mongoose = require('mongoose');
const User = require('./models/User');
const EmailLog = require('./models/EmailLog');

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

// Función para limpiar usuarios con planes inválidos
const cleanupInvalidUsers = async () => {
  console.log('🧹 Iniciando limpieza de usuarios con planes inválidos...');
  
  try {
    // Buscar usuarios con planes inválidos
    const invalidUsers = await User.find({
      $or: [
        { plan: 'free' },
        { plan: 'gratuito' },
        { plan: null },
        { plan: { $exists: false } }
      ]
    });
    
    console.log(`📊 Encontrados ${invalidUsers.length} usuarios con planes inválidos`);
    
    if (invalidUsers.length === 0) {
      console.log('✅ No hay usuarios con planes inválidos');
      return;
    }
    
    let deleted = 0;
    let kept = 0;
    
    for (const user of invalidUsers) {
      try {
        console.log(`🔄 Procesando usuario: ${user.email || user.userId} (plan: ${user.plan || 'null'})`);
        
        // Si el usuario tiene stripeId, mantenerlo pero con plan null
        if (user.stripeId) {
          await User.findByIdAndUpdate(user._id, {
            plan: null
          });
          kept++;
          console.log(`✅ Usuario con stripeId mantenido, plan establecido a null: ${user.email || user.userId}`);
        } else {
          // Si no tiene stripeId, eliminar el usuario
          await User.findByIdAndDelete(user._id);
          deleted++;
          console.log(`🗑️ Usuario sin stripeId eliminado: ${user.email || user.userId}`);
        }
      } catch (error) {
        console.error(`❌ Error procesando usuario ${user._id}:`, error.message);
      }
    }
    
    console.log('\n📈 Resumen de limpieza:');
    console.log(`✅ Usuarios mantenidos (con stripeId): ${kept}`);
    console.log(`🗑️ Usuarios eliminados (sin stripeId): ${deleted}`);
    
  } catch (error) {
    console.error('❌ Error en limpieza:', error);
  }
};

// Función para limpiar logs de email incorrectos
const cleanupInvalidEmailLogs = async () => {
  console.log('🧹 Limpiando logs de email incorrectos...');
  
  try {
    // Buscar logs de email con planes inválidos
    const invalidEmailLogs = await EmailLog.find({
      $or: [
        { 'data.plan': 'free' },
        { 'data.plan': 'gratuito' },
        { 'data.plan': null },
        { 'data.plan': { $exists: false } }
      ]
    });
    
    console.log(`📊 Encontrados ${invalidEmailLogs.length} logs de email con planes inválidos`);
    
    if (invalidEmailLogs.length === 0) {
      console.log('✅ No hay logs de email con planes inválidos');
      return;
    }
    
    // Eliminar logs de email incorrectos
    const deleteResult = await EmailLog.deleteMany({
      $or: [
        { 'data.plan': 'free' },
        { 'data.plan': 'gratuito' },
        { 'data.plan': null },
        { 'data.plan': { $exists: false } }
      ]
    });
    
    console.log(`🗑️ Eliminados ${deleteResult.deletedCount} logs de email incorrectos`);
    
  } catch (error) {
    console.error('❌ Error limpiando logs de email:', error);
  }
};

// Función para validar la consistencia
const validateConsistency = async () => {
  console.log('🔍 Validando consistencia de datos...');
  
  try {
    // Contar usuarios por plan
    const planCounts = await User.aggregate([
      { $group: { _id: '$plan', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n📊 Distribución de planes:');
    planCounts.forEach(plan => {
      console.log(`  ${plan._id || 'null'}: ${plan.count} usuarios`);
    });
    
    // Verificar usuarios con correos enviados pero sin suscripción
    const usersWithEmails = await User.aggregate([
      {
        $lookup: {
          from: 'emaillogs',
          localField: 'email',
          foreignField: 'data.email',
          as: 'emailLogs'
        }
      },
      {
        $match: {
          'emailLogs.0': { $exists: true },
          plan: { $nin: ['mensual', 'anual'] }
        }
      },
      {
        $project: {
          email: 1,
          plan: 1,
          emailCount: { $size: '$emailLogs' }
        }
      }
    ]);
    
    if (usersWithEmails.length > 0) {
      console.log(`\n⚠️ Usuarios con correos enviados pero sin suscripción válida: ${usersWithEmails.length}`);
      usersWithEmails.forEach(user => {
        console.log(`  ${user.email}: plan=${user.plan || 'null'}, emails=${user.emailCount}`);
      });
    } else {
      console.log('\n✅ No hay usuarios con correos enviados incorrectamente');
    }
    
  } catch (error) {
    console.error('❌ Error en validación:', error);
  }
};

// Función principal
const main = async () => {
  console.log('🚀 INICIANDO LIMPIEZA DE USUARIOS INVÁLIDOS');
  console.log('==========================================');
  console.log('Este script va a:');
  console.log('1. Limpiar usuarios con planes inválidos');
  console.log('2. Limpiar logs de email incorrectos');
  console.log('3. Validar la consistencia de datos');
  console.log('');
  
  await connectDB();
  
  // Limpiar usuarios inválidos
  await cleanupInvalidUsers();
  
  // Limpiar logs de email incorrectos
  await cleanupInvalidEmailLogs();
  
  // Validar consistencia
  await validateConsistency();
  
  console.log('\n✅ Limpieza completada');
  process.exit(0);
};

// Ejecutar si se llama directamente
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
}

module.exports = { cleanupInvalidUsers, cleanupInvalidEmailLogs, validateConsistency };
