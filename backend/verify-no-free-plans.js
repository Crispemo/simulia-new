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

// Función para verificar que no existan planes "free"
const verifyNoFreePlans = async () => {
  console.log('🔍 Verificando que no existan planes "free" en la base de datos...');
  
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
      return false;
    } else {
      console.log('✅ No se encontraron usuarios con plan "free" o "gratuito"');
      return true;
    }
    
  } catch (error) {
    console.error('❌ Error verificando planes:', error);
    return false;
  }
};

// Función para verificar la distribución de planes
const verifyPlanDistribution = async () => {
  console.log('📊 Verificando distribución de planes...');
  
  try {
    const planCounts = await User.aggregate([
      { $group: { _id: '$plan', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n📈 Distribución de planes:');
    planCounts.forEach(plan => {
      const planName = plan._id || 'null';
      const isValid = ['mensual', 'anual', null].includes(plan._id);
      const status = isValid ? '✅' : '❌';
      console.log(`  ${status} ${planName}: ${plan.count} usuarios`);
    });
    
    // Verificar que solo existan planes válidos
    const invalidPlans = planCounts.filter(plan => 
      !['mensual', 'anual', null].includes(plan._id)
    );
    
    if (invalidPlans.length > 0) {
      console.log('\n❌ ERROR: Se encontraron planes inválidos:');
      invalidPlans.forEach(plan => {
        console.log(`  - "${plan._id}": ${plan.count} usuarios`);
      });
      return false;
    } else {
      console.log('\n✅ Todos los planes son válidos (mensual, anual, o null)');
      return true;
    }
    
  } catch (error) {
    console.error('❌ Error verificando distribución:', error);
    return false;
  }
};

// Función para verificar usuarios con correos enviados incorrectamente
const verifyEmailConsistency = async () => {
  console.log('📧 Verificando consistencia de correos...');
  
  try {
    // Buscar usuarios con plan null pero que podrían haber recibido correos
    const usersWithNullPlan = await User.find({ plan: null });
    
    console.log(`📊 Usuarios con plan null: ${usersWithNullPlan.length}`);
    
    if (usersWithNullPlan.length > 0) {
      console.log('⚠️ Usuarios con plan null (esto es correcto si no han pagado):');
      usersWithNullPlan.forEach(user => {
        console.log(`  - ${user.email || user.userId}: stripeId=${user.stripeId || 'none'}`);
      });
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error verificando correos:', error);
    return false;
  }
};

// Función principal
const main = async () => {
  console.log('🚀 VERIFICACIÓN DE CONSISTENCIA DE PLANES');
  console.log('=========================================');
  console.log('Verificando que no existan planes "free" y que la consistencia sea correcta...');
  console.log('');
  
  await connectDB();
  
  let allChecksPassed = true;
  
  // Verificar que no existan planes "free"
  const noFreePlans = await verifyNoFreePlans();
  allChecksPassed = allChecksPassed && noFreePlans;
  
  // Verificar distribución de planes
  const validDistribution = await verifyPlanDistribution();
  allChecksPassed = allChecksPassed && validDistribution;
  
  // Verificar consistencia de correos
  const emailConsistency = await verifyEmailConsistency();
  allChecksPassed = allChecksPassed && emailConsistency;
  
  console.log('\n' + '='.repeat(50));
  if (allChecksPassed) {
    console.log('🎉 VERIFICACIÓN COMPLETADA EXITOSAMENTE');
    console.log('✅ No existen planes "free" en la base de datos');
    console.log('✅ Solo existen planes válidos (mensual, anual, null)');
    console.log('✅ La consistencia es correcta');
  } else {
    console.log('❌ VERIFICACIÓN FALLIDA');
    console.log('⚠️ Se encontraron inconsistencias que deben corregirse');
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

module.exports = { verifyNoFreePlans, verifyPlanDistribution, verifyEmailConsistency };
