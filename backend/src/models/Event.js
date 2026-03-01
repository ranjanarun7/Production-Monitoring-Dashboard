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

// OPTIMIZATION: Add compound indexes for common query patterns
// Index for worker metrics queries: worker_id + timestamp + event_type
eventSchema.index({ worker_id: 1, timestamp: 1, event_type: 1 });

// Index for workstation metrics queries: workstation_id + timestamp + event_type
eventSchema.index({ workstation_id: 1, timestamp: 1, event_type: 1 });

// Index for factory metrics queries: timestamp + event_type
eventSchema.index({ timestamp: 1, event_type: 1 });

// Index for detecting duplicates: worker_id + workstation_id + event_type + timestamp
eventSchema.index({ worker_id: 1, workstation_id: 1, event_type: 1, timestamp: 1 });

// Index for sorting events by worker and timestamp
eventSchema.index({ worker_id: 1, timestamp: 1 });

// Compound index for querying worker/station events in time range (descending for latest first)
eventSchema.index({ worker_id: 1, timestamp: -1 });
eventSchema.index({ workstation_id: 1, timestamp: -1 });
eventSchema.index({ timestamp: -1, isProcessed: 1 });

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
