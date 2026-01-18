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
  console.log('🔍 VERIFICACIÓN: Campo isDelete en exámenes');
  console.log('==========================================');

  await connectDB();

  try {
    // Definir las colecciones de exámenes que existen en el sistema
    const examCollections = ['exams', 'examen_completos', 'examen_fotos', 'examen_protocolos'];

    let totalAllExams = 0;
    let totalWithIsDelete = 0;
    let totalIsDeleteTrue = 0;
    let totalIsDeleteFalse = 0;

    console.log('📋 Verificando colecciones de exámenes...\n');

    for (const collectionName of examCollections) {
      try {
        const count = await mongoose.connection.db.collection(collectionName).countDocuments();
        console.log(`📁 ${collectionName}: ${count} documentos`);

        if (count > 0) {
          // Verificar campo isDelete en esta colección
          const withIsDelete = await mongoose.connection.db.collection(collectionName).countDocuments({
            isDelete: { $exists: true }
          });

          const isDeleteTrue = await mongoose.connection.db.collection(collectionName).countDocuments({
            isDelete: true
          });

          const isDeleteFalse = await mongoose.connection.db.collection(collectionName).countDocuments({
            isDelete: false
          });

          console.log(`   └─ Con campo isDelete: ${withIsDelete}`);
          console.log(`   └─ isDelete = true: ${isDeleteTrue}`);
          console.log(`   └─ isDelete = false: ${isDeleteFalse}`);

          // Acumular totales
          totalAllExams += count;
          totalWithIsDelete += withIsDelete;
          totalIsDeleteTrue += isDeleteTrue;
          totalIsDeleteFalse += isDeleteFalse;
        }
        console.log('');
      } catch (error) {
        console.log(`   └─ ❌ Error accediendo a colección ${collectionName}: ${error.message}`);
        console.log('');
      }
    }

    console.log('📊 RESUMEN TOTAL:');
    console.log('================');
    console.log(`📊 Total de exámenes en todas las colecciones: ${totalAllExams}`);

    if (totalAllExams === 0) {
      console.log('⚠️ No hay exámenes en ninguna colección');
      process.exit(0);
    }

    console.log(`📊 Exámenes que tienen el campo isDelete: ${totalWithIsDelete}`);
    console.log(`📊 Exámenes con isDelete = true: ${totalIsDeleteTrue}`);
    console.log(`📊 Exámenes con isDelete = false: ${totalIsDeleteFalse}`);

    // Calcular porcentaje
    const percentageWithField = ((totalWithIsDelete / totalAllExams) * 100).toFixed(1);
    console.log(`📈 Porcentaje de exámenes con campo isDelete: ${percentageWithField}%`);

    if (totalWithIsDelete === totalAllExams) {
      console.log('✅ Todos los exámenes tienen el campo isDelete');
      if (totalIsDeleteFalse === totalAllExams) {
        console.log('✅ Todos los exámenes tienen isDelete = false (valor por defecto correcto)');
      } else {
        console.log(`⚠️ ${totalIsDeleteTrue} exámenes tienen isDelete = true`);
      }
    } else {
      const missing = totalAllExams - totalWithIsDelete;
      console.log(`❌ ${missing} exámenes no tienen el campo isDelete`);
      console.log('💡 Considera ejecutar un script de migración para agregar el campo');
    }

  } catch (error) {
    console.error('❌ Error verificando exámenes:', error);
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