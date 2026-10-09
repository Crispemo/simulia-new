const mongoose = require('mongoose');

// Impugnaciones enviadas por los usuarios. Se guardan en la colección 'disputes'
// para poder revisarlas desde MongoDB aunque el email falle.
const disputeSchema = new mongoose.Schema({
  questionId: { type: String, default: null, index: true },
  question: { type: String, required: true },
  reason: { type: String, default: '' },
  userAnswer: { type: mongoose.Schema.Types.Mixed, default: null },
  userId: { type: String, default: null },
  userEmail: { type: String, default: null },
  status: { type: String, enum: ['pendiente', 'revisada', 'corregida', 'rechazada'], default: 'pendiente' },
  emailSent: { type: Boolean, default: false },
  submittedAt: { type: Date, default: Date.now }
}, { collection: 'disputes' });

module.exports = mongoose.models.Dispute || mongoose.model('Dispute', disputeSchema);
