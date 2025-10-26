const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  type: { 
    type: String, 
    required: true,
    enum: ['simulacro', 'quizz', 'contrarreloj', 'protocolos', 'errores', 'personalizado']
  },
  questions: [{
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    question: String,
    options: [String],
    correctAnswer: String,
    subject: String
  }],
  userAnswers: [{
    questionId: mongoose.Schema.Types.ObjectId,
    selectedAnswer: { type: String, default: null },
    isCorrect: { type: Boolean, default: null },
    questionData: {
      question: { type: String, default: '' },
      option_1: { type: String, default: '' },
      option_2: { type: String, default: '' },
      option_3: { type: String, default: '' },
      option_4: { type: String, default: '' },
      option_5: { type: String, default: '' },
      answer: { type: Number, default: null },
      subject: { type: String, default: 'General' },
      image: { type: String, default: null },
      long_answer: { type: String, default: '' }
    }
  }],
  // Campos para almacenar el estado actual del examen
  currentQuestion: { type: Number, default: 0 },
  timeLeft: { type: Number },
  totalTime: { type: Number },
  markedAsDoubt: { type: Map, of: Boolean, default: {} },
  selectedAnswers: { type: Map, of: String, default: {} },
  
  correct: { type: Number, default: 0 },
  incorrect: { type: Number, default: 0 },
  blank: { type: Number, default: 0 },
  totalQuestions: { type: Number, required: true },
  timeUsed: { type: Number, required: true }, // Tiempo en segundos
  score: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['in_progress', 'completed', 'paused'],
    default: 'in_progress'
  },
  startTime: { type: Date, default: Date.now },
  endTime: Date,
  date: { type: Date, default: Date.now }
});

// Método para calcular la puntuación según el tipo de examen
examSchema.methods.calculateScore = function() {
  let score = 0;
  
  switch(this.type) {
    case 'simulacro':
      // (aciertos × 3) - (fallos × 1)
      score = (this.correct * 3) - this.incorrect;
      break;
    case 'quizz':
    case 'protocolos':
    case 'personalizado':
    case 'errores':
      // aciertos - (fallos × 0.33)
      score = this.correct - (this.incorrect * 0.33);
      break;
    case 'contrarreloj':
      // Puntuación base + bonus por tiempo
      const baseScore = this.correct - (this.incorrect * 0.33);
      const timeBonus = Math.max(0, (840 - this.timeUsed) / 60);
      score = baseScore + timeBonus;
      break;
  }
  
  return Number(score.toFixed(2));
};

// Middleware para calcular la puntuación antes de guardar
examSchema.pre('save', function(next) {
  try {
    if (this.status === 'completed' && !this.endTime) {
      this.endTime = new Date();
    }
    if (this.status === 'completed') {
      // Asegurarse de que los userAnswers tengan toda la información necesaria
      // La estructura de userAnswers ya debe estar completa cuando se guarda
      // con questionId, selectedAnswer, isCorrect y questionData
      
      this.score = this.calculateScore();
    }
    next();
  } catch (error) {
    console.error('Error en middleware pre-save de Exam:', error);
    next(error);
  }
});

module.exports = mongoose.model('Exam', examSchema); 