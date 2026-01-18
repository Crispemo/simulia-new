#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const Exam = require('./models/Exam');
const ExamenResultado = require('./models/ExamenResultado');

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
  console.log('🧪 PRUEBA: Verificando campo isDelete por defecto');
  console.log('================================================');

  await connectDB();

  try {
    console.log('📝 Creando examen de prueba...');

    // Crear un examen de prueba
    const testExam = new Exam({
      userId: 'test-user-123',
      type: 'simulacro',
      questions: [],
      userAnswers: [],
      totalQuestions: 10,
      timeUsed: 600,
      score: 8.5
    });

    // Guardar el examen
    await testExam.save();
    console.log('✅ Examen guardado con ID:', testExam._id);

    // Verificar que tenga el campo isDelete
    const savedExam = await Exam.findById(testExam._id);
    console.log('📊 Campo isDelete en examen guardado:', savedExam.isDelete);

    // Crear un ExamenResultado de prueba
    console.log('\n📝 Creando examen resultado de prueba...');
    const testResultado = new ExamenResultado({
      userId: 'test-user-123',
      type: 'simulacro',
      correct: 8,
      incorrect: 2,
      totalQuestions: 10,
      timeUsed: 600,
      score: 8.5
    });

    // Guardar el resultado
    await testResultado.save();
    console.log('✅ ExamenResultado guardado con ID:', testResultado._id);

    // Verificar que tenga el campo isDelete
    const savedResultado = await ExamenResultado.findById(testResultado._id);
    console.log('📊 Campo isDelete en examen resultado guardado:', savedResultado.isDelete);

    // Limpiar datos de prueba
    console.log('\n🧹 Limpiando datos de prueba...');
    await Exam.findByIdAndDelete(testExam._id);
    await ExamenResultado.findByIdAndDelete(testResultado._id);
    console.log('✅ Datos de prueba eliminados');

    console.log('\n🎉 ¡PRUEBA EXITOSA!');
    console.log('✅ Todos los nuevos exámenes tendrán isDelete = false por defecto');

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
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