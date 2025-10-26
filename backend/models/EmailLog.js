const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
  emailKey: {
    type: String,
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    index: true
  },
  plan: String,
  sessionId: String,
  stripeId: String,
  sentAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  status: {
    type: String,
    enum: ['sent', 'failed', 'skipped'],
    default: 'sent'
  },
  webhookResponse: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

// Índices para optimizar consultas
emailLogSchema.index({ emailKey: 1 });
emailLogSchema.index({ email: 1, sentAt: 1 });
emailLogSchema.index({ createdAt: 1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);

