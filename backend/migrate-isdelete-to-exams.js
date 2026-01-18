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

// Función para migrar una colección específica
const migrateCollection = async (collectionName) => {
  console.log(`🔄 Migrando colección: ${collectionName}`);

  try {
    const count = await mongoose.connection.db.collection(collectionName).countDocuments();
    console.log(`   📊 Documentos encontrados: ${count}`);

    if (count === 0) {
      console.log(`   ⏭️  Saltando colección vacía`);
      return { migrated: 0, total: 0 };
    }

    // Verificar cuántos ya tienen el campo
    const withField = await mongoose.connection.db.collection(collectionName).countDocuments({
      isDelete: { $exists: true }
    });

    if (withField === count) {
      console.log(`   ✅ Todos los documentos ya tienen el campo isDelete`);
      return { migrated: 0, total: count };
    }

    // Realizar la migración
    const result = await mongoose.connection.db.collection(collectionName).updateMany(
      { isDelete: { $exists: false } },
      { $set: { isDelete: false } }
    );

    console.log(`   ✅ Campo 'isDelete' agregado a ${result.modifiedCount} documentos`);

    // Verificar resultado
    const finalCount = await mongoose.connection.db.collection(collectionName).countDocuments({
      isDelete: { $exists: true }
    });

    console.log(`   📊 Documentos con campo isDelete después: ${finalCount}`);

    return { migrated: result.modifiedCount, total: count };

  } catch (error) {
    console.error(`   ❌ Error migrando colección ${collectionName}:`, error.message);
    return { migrated: 0, total: 0, error: error.message };
  }
};

// Función principal
const main = async () => {
  console.log('🔧 MIGRACIÓN: Agregando campo isDelete a exámenes');
  console.log('================================================');

  await connectDB();

  try {
    // Definir las colecciones de exámenes que existen en el sistema
    const examCollections = ['exams', 'examen_completos', 'examen_fotos', 'examen_protocolos'];

    let totalMigrated = 0;
    let totalDocuments = 0;

    console.log('📋 Iniciando migración...\n');

    for (const collectionName of examCollections) {
      const result = await migrateCollection(collectionName);

      if (!result.error) {
        totalMigrated += result.migrated;
        totalDocuments += result.total;
      }
      console.log('');
    }

    console.log('📊 RESUMEN DE MIGRACIÓN:');
    console.log('=======================');
    console.log(`📊 Total de documentos procesados: ${totalDocuments}`);
    console.log(`✅ Documentos migrados (campo agregado): ${totalMigrated}`);

    if (totalMigrated > 0) {
      console.log('🎉 ¡Migración completada exitosamente!');
      console.log('💡 Todos los exámenes ahora tienen el campo isDelete = false');
    } else {
      console.log('ℹ️  No se realizó ninguna migración (todos los documentos ya tenían el campo)');
    }

    // Verificación final
    console.log('\n🔍 VERIFICACIÓN FINAL:');
    console.log('=====================');

    let finalTotal = 0;
    let finalWithField = 0;

    for (const collectionName of examCollections) {
      try {
        const count = await mongoose.connection.db.collection(collectionName).countDocuments();
        const withField = await mongoose.connection.db.collection(collectionName).countDocuments({
          isDelete: { $exists: true }
        });

        finalTotal += count;
        finalWithField += withField;

        console.log(`📁 ${collectionName}: ${withField}/${count} documentos con isDelete`);
      } catch (error) {
        console.log(`📁 ${collectionName}: Error verificando - ${error.message}`);
      }
    }

    console.log(`\n📊 TOTAL FINAL: ${finalWithField}/${finalTotal} exámenes tienen el campo isDelete`);

    if (finalTotal > 0 && finalWithField === finalTotal) {
      console.log('✅ ¡MIGRACIÓN EXITOSA! Todos los exámenes tienen el campo isDelete');
    } else if (finalTotal > 0) {
      const missing = finalTotal - finalWithField;
      console.log(`❌ Aún faltan ${missing} exámenes por migrar`);
    }

  } catch (error) {
    console.error('❌ Error en la migración:', error);
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