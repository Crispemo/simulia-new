const mongoose = require('mongoose');

const examenResultadoSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  userAnswers: [{
    questionId: mongoose.Schema.Types.ObjectId,
    selectedAnswer: String,
    isCorrect: Boolean,
    markedAsDoubt: {
      type: Boolean,
      default: false
    },
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
    }
  }],
  correct: {
    type: Number,
    default: 0
  },
  incorrect: {
    type: Number,
    default: 0
  },
  blank: {
    type: Number,
    default: 0
  },
  totalQuestions: {
    type: Number,
    default: 0
  },
  timeUsed: {
    type: Number,
    default: 0
  },
  totalTime: Number,
  score: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['in_progress', 'paused', 'completed'],
    default: 'in_progress'
  },
  currentQuestion: {
    type: Number,
    default: 0
  },
  timeLeft: Number,
  markedAsDoubt: {
    type: Object,
    default: {}
  },
  selectedAnswers: {
    type: Object,
    default: {}
  }
}, { timestamps: true });

const ExamenResultado = mongoose.model('ExamenResultado', examenResultadoSchema, 'examen-resultados');

module.exports = ExamenResultado; 
