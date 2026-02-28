const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      required: true,
      index: true
    },
    worker_id: {
      type: String,
      required: true,
      index: true
    },
    workstation_id: {
      type: String,
      required: true,
      index: true
    },
    event_type: {
      type: String,
      enum: ['working', 'idle', 'absent', 'product_count'],
      required: true,
      index: true
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.95
    },
    count: {
      type: Number,
      default: 0
    },
    duration: {
      type: Number,
      default: null
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    isProcessed: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  { timestamps: true }
);

// Compound index for querying worker/station events in time range
eventSchema.index({ worker_id: 1, timestamp: -1 });
eventSchema.index({ workstation_id: 1, timestamp: -1 });
eventSchema.index({ timestamp: -1, isProcessed: 1 });

module.exports = mongoose.model('Event', eventSchema);
