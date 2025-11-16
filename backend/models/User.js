// models/User.js
const mongoose = require('mongoose');

const examHistorySchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  type: String,
  date: { type: Date, default: Date.now },
  questions: Array,
  userAnswers: Array,
  correctAnswers: Array,
  correct: Number,
  incorrect: Number,
  totalQuestions: Number,
  timeUsed: Number,
  status: { type: String, enum: ['completed', 'in_progress'], default: 'completed' }
}, { _id: true });

const failedQuestionSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  subject: { type: String },
  lastAttempt: { type: Date, default: Date.now },
  attemptCount: { type: Number, default: 1 }
}, { _id: false });

const unansweredQuestionSchema = new mongoose.Schema({
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
  markedAsDoubt: { type: Boolean, default: false }
}, { _id: false });

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  userName: { type: String },
  stripeId: { type: String, index: true, unique: true, sparse: true },
  plan: { type: String, enum: ['mensual', 'anual'], required: false, default: null },
  expirationDate: { type: Date },
  examHistory: [examHistorySchema],
  failedQuestions: [failedQuestionSchema],
  unansweredQuestions: [unansweredQuestionSchema],
  examProgress: { type: mongoose.Schema.Types.Mixed },
  role: { type: String, default: 'user' },
  // Preferencias de práctica y recordatorios
  practicePreferences: {
    cadenceDays: { type: Number, default: 3, min: 1, max: 30 },
    channel: { type: String, enum: ['email', 'sms', 'push'], default: 'email' },
    emailReminders: { type: Boolean, default: true },
    emailOverride: { type: String },
    phoneE164: { type: String } // +34123456789
  },
  // Actividad y racha
  lastActivityAt: { type: Date },
  streak: {
    current: { type: Number, default: 0 },
    best: { type: Number, default: 0 },
    lastStreakDay: { type: Date }
  },
  // Control de recordatorios
  lastReminderSentAt: { type: Date },
  remindersCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
