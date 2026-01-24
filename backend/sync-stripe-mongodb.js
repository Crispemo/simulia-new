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

// Determinar el plan a partir del intervalo de cobro (más robusto que depender de priceIds hardcodeados)
const getPlanFromRecurringInterval = (interval) => {
  if (interval === 'month') return 'mensual';
  if (interval === 'year') return 'anual';
  return null;
};

// Función para sincronizar usuarios desde Stripe a MongoDB
const syncUsersFromStripe = async () => {
  console.log('🔄 Iniciando sincronización desde Stripe...');
  
  try {
    // Obtener todos los clientes de Stripe
    let customers = [];
    let hasMore = true;
    let startingAfter = null;
    
    while (hasMore) {
      const params = { limit: 100 };
      if (startingAfter) params.starting_after = startingAfter;
      
      const response = await stripe.customers.list(params);
      customers = customers.concat(response.data);
      hasMore = response.has_more;
      startingAfter = response.data[response.data.length - 1]?.id;
    }
    
    console.log(`📊 Encontrados ${customers.length} clientes en Stripe`);
    
    // Obtener todas las suscripciones activas
    let subscriptions = [];
    hasMore = true;
    startingAfter = null;
    
    while (hasMore) {
      const params = { 
        limit: 100,
        status: 'active'
      };
      if (startingAfter) params.starting_after = startingAfter;
      
      const response = await stripe.subscriptions.list(params);
      subscriptions = subscriptions.concat(response.data);
      hasMore = response.has_more;
      startingAfter = response.data[response.data.length - 1]?.id;
    }
    
    console.log(`📊 Encontradas ${subscriptions.length} suscripciones activas en Stripe`);
    
    // Crear mapa de suscripciones por cliente
    const subscriptionMap = new Map();
    subscriptions.forEach(sub => {
      const customerId = sub.customer;
    const interval = sub.items.data[0]?.price?.recurring?.interval;
    const plan = getPlanFromRecurringInterval(interval);
      
      subscriptionMap.set(customerId, {
        plan,
        status: sub.status,
        current_period_end: sub.current_period_end
      });
    });
    
    let created = 0;
    let updated = 0;
    let errors = 0;
    
    // Procesar cada cliente
    for (const customer of customers) {
      try {
        const subscription = subscriptionMap.get(customer.id);
        
        if (subscription && ['mensual', 'anual'].includes(subscription.plan)) {
          // Cliente con suscripción activa y plan válido
          const userData = {
            userId: customer.metadata?.userId || customer.id,
            email: customer.email || customer.id,
            userName: customer.name || customer.email || customer.id,
            stripeId: customer.id,
            plan: subscription.plan,
            expirationDate: new Date(subscription.current_period_end * 1000)
          };
          
          const existingUser = await User.findOne({ 
            $or: [
              { stripeId: customer.id },
              { email: customer.email },
              { userId: userData.userId }
            ]
          });
          
          if (existingUser) {
            // Actualizar usuario existente
            await User.findOneAndUpdate(
              { _id: existingUser._id },
              {
                plan: subscription.plan,
                stripeId: customer.id,
                email: customer.email || existingUser.email,
                userName: customer.name || existingUser.userName,
                expirationDate: new Date(subscription.current_period_end * 1000)
              }
            );
            updated++;
            console.log(`✅ Actualizado usuario: ${customer.email || customer.id}`);
          } else {
            // Crear nuevo usuario
            const newUser = new User(userData);
            await newUser.save();
            created++;
            console.log(`🆕 Creado usuario: ${customer.email || customer.id}`);
          }
        } else if (subscription && !['mensual', 'anual'].includes(subscription.plan)) {
          // Cliente con suscripción pero plan inválido - establecer plan como null
          const existingUser = await User.findOne({ stripeId: customer.id });
          if (existingUser) {
            await User.findOneAndUpdate(
              { stripeId: customer.id },
              { plan: null }
            );
            console.log(`⚠️ Plan establecido a null para cliente con plan inválido: ${customer.email || customer.id} (plan: ${subscription.plan})`);
          }
        } else {
          // Cliente sin suscripción activa - eliminar de MongoDB si existe
          const deletedUser = await User.findOneAndDelete({ stripeId: customer.id });
          if (deletedUser) {
            console.log(`🗑️ Eliminado usuario sin suscripción: ${customer.email || customer.id}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error procesando cliente ${customer.id}:`, error.message);
        errors++;
      }
    }
    
    console.log('\n📈 Resumen de sincronización:');
    console.log(`✅ Usuarios creados: ${created}`);
    console.log(`🔄 Usuarios actualizados: ${updated}`);
    console.log(`❌ Errores: ${errors}`);
    
  } catch (error) {
    console.error('❌ Error en sincronización:', error);
  }
};

// Función para limpiar usuarios huérfanos en MongoDB
const cleanOrphanedUsers = async () => {
  console.log('🧹 Limpiando usuarios huérfanos en MongoDB...');
  
  try {
    // Obtener todos los usuarios de MongoDB
    const mongoUsers = await User.find({});
    console.log(`📊 Encontrados ${mongoUsers.length} usuarios en MongoDB`);
    
    // Obtener todos los clientes de Stripe
    let stripeCustomers = [];
    let hasMore = true;
    let startingAfter = null;
    
    while (hasMore) {
      const params = { limit: 100 };
      if (startingAfter) params.starting_after = startingAfter;
      
      const response = await stripe.customers.list(params);
      stripeCustomers = stripeCustomers.concat(response.data);
      hasMore = response.has_more;
      startingAfter = response.data[response.data.length - 1]?.id;
    }
    
    const stripeCustomerIds = new Set(stripeCustomers.map(c => c.id));
    
    // Encontrar usuarios huérfanos
    const orphanedUsers = mongoUsers.filter(user => 
      user.stripeId && !stripeCustomerIds.has(user.stripeId)
    );
    
    console.log(`🗑️ Encontrados ${orphanedUsers.length} usuarios huérfanos`);
    
    // Eliminar usuarios huérfanos
    for (const user of orphanedUsers) {
      await User.findByIdAndDelete(user._id);
      console.log(`🗑️ Eliminado usuario huérfano: ${user.email || user.userId}`);
    }
    
    console.log(`✅ Limpieza completada. Eliminados ${orphanedUsers.length} usuarios huérfanos`);
    
  } catch (error) {
    console.error('❌ Error en limpieza:', error);
  }
};

// Función principal
const main = async () => {
  console.log('🚀 Iniciando sincronización Stripe ↔ MongoDB');
  console.log('==========================================');
  
  await connectDB();
  
  // Sincronizar desde Stripe a MongoDB
  await syncUsersFromStripe();
  
  // Limpiar usuarios huérfanos
  await cleanOrphanedUsers();
  
  console.log('\n✅ Sincronización completada');
  process.exit(0);
};

// Ejecutar si se llama directamente
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
}

module.exports = { syncUsersFromStripe, cleanOrphanedUsers };
