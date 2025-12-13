const mongoose = require('mongoose');

const flashcardSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true,
    index: true
  },
  questionId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true,
    index: true
  },
  // Cara A: Pregunta clave resumida
  front: {
    type: String,
    required: true
  },
  // Cara B: Explicación comprimida + mini-esquema
  back: {
    type: String,
    required: true
  },
  // Datos originales de la pregunta para referencia
  questionData: {
    question: String,
    option_1: String,
    option_2: String,
    option_3: String,
    option_4: String,
    option_5: String,
    answer: String,
    subject: String,
    image: String,
    long_answer: String
  },
  // Estado de la flashcard
  status: {
    type: String,
    enum: ['active', 'mastered', 'removed'],
    default: 'active'
  },
  // Contador de veces que se ha visto
  viewCount: {
    type: Number,
    default: 0
  },
  // Última vez que se vio
  lastViewed: {
    type: Date,
    default: Date.now
  },
  // Fecha de creación
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Fecha de última actualización
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Índices compuestos para búsquedas eficientes
flashcardSchema.index({ userId: 1, status: 1 });
flashcardSchema.index({ userId: 1, questionId: 1 }, { unique: true });
flashcardSchema.index({ userId: 1, lastViewed: 1 });

module.exports = mongoose.model('Flashcard', flashcardSchema);






