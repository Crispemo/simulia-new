const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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

// Función para obtener el plan correcto desde Stripe
const getCorrectPlanFromStripe = async (stripeId) => {
  try {
    // Obtener suscripciones activas del cliente
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeId,
      status: 'active'
    });

    if (subscriptions.data.length === 0) {
      console.log(`⚠️ Cliente ${stripeId} no tiene suscripciones activas`);
      return null;
    }

    // Obtener la primera suscripción activa
    const subscription = subscriptions.data[0];
    const item = subscription.items.data[0];
    const priceId = item?.price?.id;
    const interval = item?.price?.recurring?.interval;
    const plan = interval === 'month' ? 'mensual' : interval === 'year' ? 'anual' : null;
    console.log(`📊 Cliente ${stripeId}: interval=${interval}, priceId=${priceId}, plan=${plan}`);
    
    return plan;
  } catch (error) {
    console.error(`❌ Error obteniendo plan desde Stripe para ${stripeId}:`, error.message);
    return null;
  }
};

// Función para corregir usuarios existentes con plan "free"
const fixExistingFreeUsers = async () => {
  console.log('🔧 Corrigiendo usuarios existentes con plan "free"...');
  
  try {
    // Buscar usuarios con plan "free" que tengan stripeId
    const usersWithFreePlan = await User.find({ 
      plan: 'free',
      stripeId: { $exists: true, $ne: null }
    });
    
    console.log(`📊 Encontrados ${usersWithFreePlan.length} usuarios con plan "free" y stripeId`);
    
    if (usersWithFreePlan.length === 0) {
      console.log('✅ No hay usuarios con plan "free" y stripeId');
      return;
    }
    
    let corrected = 0;
    let errors = 0;
    
    for (const user of usersWithFreePlan) {
      try {
        console.log(`\n🔄 Procesando usuario: ${user.email || user.userId} (stripeId: ${user.stripeId})`);
        
        // Obtener plan correcto desde Stripe
        const correctPlan = await getCorrectPlanFromStripe(user.stripeId);
        
        if (correctPlan && ['mensual', 'anual'].includes(correctPlan)) {
          // Actualizar con el plan correcto
          await User.findByIdAndUpdate(user._id, { plan: correctPlan });
          corrected++;
          console.log(`✅ Usuario corregido: ${user.email || user.userId} → plan: ${correctPlan}`);
        } else {
          // No se pudo determinar el plan correcto - establecer como null
          await User.findByIdAndUpdate(user._id, { plan: null });
          corrected++;
          console.log(`⚠️ Usuario con plan null: ${user.email || user.userId} (no se pudo determinar plan desde Stripe)`);
        }
      } catch (error) {
        console.error(`❌ Error procesando usuario ${user._id}:`, error.message);
        errors++;
      }
    }
    
    console.log('\n📈 Resumen de corrección:');
    console.log(`✅ Usuarios corregidos: ${corrected}`);
    console.log(`❌ Errores: ${errors}`);
    
  } catch (error) {
    console.error('❌ Error en corrección:', error);
  }
};

// Función para verificar usuarios sin stripeId pero con plan "free"
const fixUsersWithoutStripeId = async () => {
  console.log('🔧 Corrigiendo usuarios con plan "free" sin stripeId...');
  
  try {
    // Buscar usuarios con plan "free" que NO tengan stripeId
    const usersWithoutStripeId = await User.find({ 
      plan: 'free',
      $or: [
        { stripeId: { $exists: false } },
        { stripeId: null }
      ]
    });
    
    console.log(`📊 Encontrados ${usersWithoutStripeId.length} usuarios con plan "free" sin stripeId`);
    
    if (usersWithoutStripeId.length === 0) {
      console.log('✅ No hay usuarios con plan "free" sin stripeId');
      return;
    }
    
    let deleted = 0;
    let errors = 0;
    
    for (const user of usersWithoutStripeId) {
      try {
        console.log(`\n🔄 Procesando usuario: ${user.email || user.userId} (sin stripeId)`);
        
        // Eliminar usuario sin stripeId
        await User.findByIdAndDelete(user._id);
        deleted++;
        console.log(`🗑️ Usuario eliminado: ${user.email || user.userId} (sin stripeId)`);
      } catch (error) {
        console.error(`❌ Error procesando usuario ${user._id}:`, error.message);
        errors++;
      }
    }
    
    console.log('\n📈 Resumen de eliminación:');
    console.log(`🗑️ Usuarios eliminados: ${deleted}`);
    console.log(`❌ Errores: ${errors}`);
    
  } catch (error) {
    console.error('❌ Error en eliminación:', error);
  }
};

// Función para verificar el estado final
const verifyFinalState = async () => {
  console.log('🔍 Verificando estado final...');
  
  try {
    // Contar usuarios por plan
    const planCounts = await User.aggregate([
      { $group: { _id: '$plan', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n📊 Distribución final de planes:');
    planCounts.forEach(plan => {
      const planName = plan._id || 'null';
      const isValid = ['mensual', 'anual', null].includes(plan._id);
      const status = isValid ? '✅' : '❌';
      console.log(`  ${status} ${planName}: ${plan.count} usuarios`);
    });
    
    // Verificar que no queden usuarios con plan "free"
    const remainingFreeUsers = await User.countDocuments({ plan: 'free' });
    if (remainingFreeUsers > 0) {
      console.log(`\n❌ ERROR: Aún quedan ${remainingFreeUsers} usuarios con plan "free"`);
      return false;
    } else {
      console.log('\n✅ CORRECTO: No quedan usuarios con plan "free"');
      return true;
    }
    
  } catch (error) {
    console.error('❌ Error verificando estado final:', error);
    return false;
  }
};

// Función principal
const main = async () => {
  console.log('🚀 CORRECCIÓN DE USUARIOS EXISTENTES CON PLAN "FREE"');
  console.log('==================================================');
  console.log('Este script va a:');
  console.log('1. Corregir usuarios con plan "free" que tengan stripeId');
  console.log('2. Eliminar usuarios con plan "free" sin stripeId');
  console.log('3. Verificar el estado final');
  console.log('');
  
  await connectDB();
  
  // Corregir usuarios con stripeId
  await fixExistingFreeUsers();
  
  // Eliminar usuarios sin stripeId
  await fixUsersWithoutStripeId();
  
  // Verificar estado final
  const isCorrect = await verifyFinalState();
  
  if (isCorrect) {
    console.log('\n🎉 CORRECCIÓN COMPLETADA EXITOSAMENTE');
    console.log('✅ No quedan usuarios con plan "free"');
    console.log('✅ Todos los usuarios tienen planes válidos o null');
  } else {
    console.log('\n❌ CORRECCIÓN INCOMPLETA');
    console.log('⚠️ Aún quedan usuarios con plan "free"');
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

module.exports = { fixExistingFreeUsers, fixUsersWithoutStripeId, verifyFinalState };

