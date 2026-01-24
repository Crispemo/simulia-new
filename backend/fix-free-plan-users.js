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
    // Obtener el cliente de Stripe
    const customer = await stripe.customers.retrieve(stripeId);
    if (!customer) return null;

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

// Función para corregir usuarios con plan "free"
const fixFreePlanUsers = async () => {
  console.log('🔧 Iniciando corrección de usuarios con plan "free"...');
  
  try {
    // Buscar usuarios con plan "free"
    const usersWithFreePlan = await User.find({ plan: 'free' });
    
    console.log(`📊 Encontrados ${usersWithFreePlan.length} usuarios con plan "free"`);
    
    if (usersWithFreePlan.length === 0) {
      console.log('✅ No hay usuarios con plan "free"');
      return;
    }
    
    let corrected = 0;
    let deleted = 0;
    let errors = 0;
    
    for (const user of usersWithFreePlan) {
      try {
        console.log(`\n🔄 Procesando usuario: ${user.email || user.userId} (stripeId: ${user.stripeId || 'none'})`);
        
        if (user.stripeId) {
          // Usuario tiene stripeId - obtener plan correcto desde Stripe
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
        } else {
          // Usuario sin stripeId - eliminar
          await User.findByIdAndDelete(user._id);
          deleted++;
          console.log(`🗑️ Usuario eliminado: ${user.email || user.userId} (sin stripeId)`);
        }
      } catch (error) {
        console.error(`❌ Error procesando usuario ${user._id}:`, error.message);
        errors++;
      }
    }
    
    console.log('\n📈 Resumen de corrección:');
    console.log(`✅ Usuarios corregidos: ${corrected}`);
    console.log(`🗑️ Usuarios eliminados: ${deleted}`);
    console.log(`❌ Errores: ${errors}`);
    
  } catch (error) {
    console.error('❌ Error en corrección:', error);
  }
};

// Función para verificar usuarios con suscripciones activas en Stripe pero plan incorrecto en MongoDB
const checkStripeMongoConsistency = async () => {
  console.log('🔍 Verificando consistencia entre Stripe y MongoDB...');
  
  try {
    // Obtener todos los usuarios de MongoDB
    const mongoUsers = await User.find({});
    console.log(`📊 Usuarios en MongoDB: ${mongoUsers.length}`);
    
    let inconsistentUsers = [];
    
    for (const user of mongoUsers) {
      if (user.stripeId) {
        const correctPlan = await getCorrectPlanFromStripe(user.stripeId);
        
        if (correctPlan && correctPlan !== user.plan) {
          inconsistentUsers.push({
            user,
            currentPlan: user.plan,
            correctPlan: correctPlan
          });
        }
      }
    }
    
    if (inconsistentUsers.length > 0) {
      console.log(`\n⚠️ Encontrados ${inconsistentUsers.length} usuarios con planes inconsistentes:`);
      inconsistentUsers.forEach(({ user, currentPlan, correctPlan }) => {
        console.log(`  - ${user.email || user.userId}: MongoDB="${currentPlan}" vs Stripe="${correctPlan}"`);
      });
    } else {
      console.log('\n✅ Todos los usuarios con stripeId tienen planes consistentes');
    }
    
    return inconsistentUsers;
    
  } catch (error) {
    console.error('❌ Error verificando consistencia:', error);
    return [];
  }
};

// Función principal
const main = async () => {
  console.log('🚀 CORRECCIÓN DE USUARIOS CON PLAN "FREE"');
  console.log('=========================================');
  console.log('Este script va a:');
  console.log('1. Corregir usuarios con plan "free" incorrecto');
  console.log('2. Verificar consistencia entre Stripe y MongoDB');
  console.log('3. Sincronizar planes correctos desde Stripe');
  console.log('');
  
  await connectDB();
  
  // Corregir usuarios con plan "free"
  await fixFreePlanUsers();
  
  // Verificar consistencia
  const inconsistentUsers = await checkStripeMongoConsistency();
  
  if (inconsistentUsers.length > 0) {
    console.log('\n🔧 Corrigiendo usuarios inconsistentes...');
    for (const { user, correctPlan } of inconsistentUsers) {
      try {
        await User.findByIdAndUpdate(user._id, { plan: correctPlan });
        console.log(`✅ Corregido: ${user.email || user.userId} → ${correctPlan}`);
      } catch (error) {
        console.error(`❌ Error corrigiendo ${user.email || user.userId}:`, error.message);
      }
    }
  }
  
  console.log('\n✅ Corrección completada');
  process.exit(0);
};

// Ejecutar si se llama directamente
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
}

module.exports = { fixFreePlanUsers, checkStripeMongoConsistency, getCorrectPlanFromStripe };

