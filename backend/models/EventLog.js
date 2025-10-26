const mongoose = require('mongoose');

const eventLogSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  eventType: {
    type: String,
    required: true,
    index: true
  },
  processedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed
  },
  status: {
    type: String,
    enum: ['processed', 'failed', 'skipped'],
    default: 'processed'
  },
  error: String
}, {
  timestamps: true
});

// Índices para optimizar consultas
eventLogSchema.index({ eventId: 1 });
eventLogSchema.index({ eventType: 1, processedAt: 1 });
eventLogSchema.index({ processedAt: 1 });

module.exports = mongoose.model('EventLog', eventLogSchema);

