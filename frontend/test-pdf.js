import { generateExamPdfNative } from './src/lib/pdfUtils.js';

// Datos de prueba
const testQuestions = [
  {
    question: "En relación con la atención de enfermería a un paciente con insuficiencia cardíaca, señale la respuesta INCORRECTA:",
    options: [
      "Monitorizar la presión arterial y frecuencia cardíaca",
      "Administrar diuréticos según prescripción médica",
      "Colocar al paciente en posición de Trendelenburg",
      "Valorar la presencia de edemas periféricos"
    ],
    correct: "C"
  },
  {
    question: "¿Cuál de las siguientes afirmaciones sobre el lavado de manos quirúrgico es correcta?",
    options: [
      "Debe durar al menos 5 minutos",
      "Se realiza con jabón neutro común",
      "El cepillado debe ser enérgico y prolongado",
      "Se realiza con solución antiséptica y dura 2-3 minutos"
    ],
    correct: "D"
  },
  {
    question: "En la valoración del dolor, la escala EVA:",
    options: [
      "Es una escala observacional",
      "Valora el dolor de 0 a 5",
      "Es una escala visual analógica que va de 0 a 10",
      "Solo se puede usar en dolor agudo"
    ],
    correct: "C"
  }
];

// Generar PDF de prueba
generateExamPdfNative({
  title: 'SIMULIA',
  subtitle: 'Simulacro EIR',
  examId: 'TEST-001',
  date: '2024-01-15',
  durationMin: 180,
  questions: testQuestions,
  showAnswerKey: true,
  fileName: 'test-simulacro.pdf'
}).then(() => {
  console.log('PDF generado correctamente');
}).catch(err => {
  console.error('Error al generar PDF:', err);
});


