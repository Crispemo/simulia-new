const mongoose = require('mongoose');

const unansweredQuestionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  subject: { type: String, default: 'General' },
  questionData: {
    question: { type: String, default: '' },
    option_1: { type: String, default: '' },
    option_2: { type: String, default: '' },
    option_3: { type: String, default: '' },
    option_4: { type: String, default: '' },
    option_5: { type: String, default: '' },
    answer: { type: String, default: '' },
    subject: { type: String, default: 'General' },
    image: { type: String, default: null },
    long_answer: { type: String, default: '' }
  },
  examId: { type: mongoose.Schema.Types.ObjectId },
  lastSeen: { type: Date, default: Date.now },
  needsReview: { type: Boolean, default: true },
  markedAsDoubt: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Índices compuestos para búsquedas más eficientes
unansweredQuestionSchema.index({ userId: 1, questionId: 1 }, { unique: true });
unansweredQuestionSchema.index({ userId: 1, subject: 1 });
unansweredQuestionSchema.index({ userId: 1, lastSeen: -1 });

module.exports = mongoose.model('UnansweredQuestion', unansweredQuestionSchema); 
