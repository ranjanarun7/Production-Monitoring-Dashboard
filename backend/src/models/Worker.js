const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema(
  {
    worker_id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: true
    },
    email: String,
    department: String,
    shift: {
      type: String,
      default: 'day'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Worker', workerSchema);
