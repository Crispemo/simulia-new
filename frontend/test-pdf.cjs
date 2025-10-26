const { jsPDF } = require('jspdf');

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

// Crear PDF
const doc = new jsPDF();
const pageW = doc.internal.pageSize.width;
const pageH = doc.internal.pageSize.height;
const marginX = 20;
const marginY = 20;
let y = marginY;

// Título
doc.setFontSize(16);
doc.setFont('helvetica', 'bold');
doc.text('SIMULIA', marginX, y);
y += 10;

// Subtítulo
doc.setFontSize(12);
doc.text('Simulacro EIR - ID: TEST-001', marginX, y);
y += 10;

// Fecha y duración
doc.setFontSize(10);
doc.setFont('helvetica', 'normal');
doc.text('Fecha: 2024-01-15 - Duración: 180 min', marginX, y);
y += 20;

// Preguntas
testQuestions.forEach((q, i) => {
  // Verificar si necesitamos nueva página
  if (y > pageH - 40) {
    doc.addPage();
    y = marginY;
  }

  // Número de pregunta
  doc.setFont('helvetica', 'bold');
  doc.text(`${i + 1}.`, marginX, y);
  
  // Enunciado
  doc.setFont('helvetica', 'normal');
  const questionText = q.question || q.text || '';
  const splitQuestion = doc.splitTextToSize(questionText, pageW - marginX * 2 - 10);
  doc.text(splitQuestion, marginX + 10, y);
  y += splitQuestion.length * 7;

  // Opciones
  q.options.forEach((opt, idx) => {
    const letter = String.fromCharCode(65 + idx); // A,B,C,D
    const optionText = `${letter}) ${opt}`;
    const splitOption = doc.splitTextToSize(optionText, pageW - marginX * 2 - 20);
    doc.text(splitOption, marginX + 20, y);
    y += splitOption.length * 7;
  });

  y += 10; // Espacio entre preguntas
});

// Numeración de páginas
const pages = doc.internal.getNumberOfPages();
for (let i = 1; i <= pages; i++) {
  doc.setPage(i);
  doc.setFontSize(8);
  doc.text(`Página ${i} de ${pages}`, pageW - marginX, pageH - 10);
}

// Guardar PDF
doc.save('test-simulacro.pdf');
console.log('PDF generado correctamente');


