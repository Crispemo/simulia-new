#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');

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
  console.log('📋 LISTADO DE COLECCIONES EN LA BASE DE DATOS');
  console.log('============================================');

  await connectDB();

  try {
    // Obtener lista de colecciones
    const collections = await mongoose.connection.db.listCollections().toArray();

    console.log(`📊 Total de colecciones encontradas: ${collections.length}`);
    console.log('');

    // Mostrar información de cada colección
    for (const collection of collections) {
      const count = await mongoose.connection.db.collection(collection.name).countDocuments();
      console.log(`📁 ${collection.name}: ${count} documentos`);

      // Si es una colección de exámenes, mostrar algunos detalles
      if (collection.name.toLowerCase().includes('exam')) {
        console.log(`   └─ Posible colección de exámenes detectada`);
      }
    }

    console.log('');
    console.log('🔍 Buscando colecciones relacionadas con exámenes...');

    const examCollections = collections.filter(col =>
      col.name.toLowerCase().includes('exam') ||
      col.name.toLowerCase().includes('examen')
    );

    if (examCollections.length > 0) {
      console.log('✅ Colecciones relacionadas con exámenes encontradas:');
      examCollections.forEach(col => {
        console.log(`   - ${col.name}`);
      });
    } else {
      console.log('❌ No se encontraron colecciones relacionadas con exámenes');
    }

  } catch (error) {
    console.error('❌ Error listando colecciones:', error);
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