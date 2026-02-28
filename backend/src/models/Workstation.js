const mongoose = require('mongoose');

const workstationSchema = new mongoose.Schema(
  {
    station_id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['assembly', 'packaging', 'quality_check', 'welding', 'painting', 'testing'],
      required: true
    },
    location: String,
    capacity: {
      type: Number,
      default: 1
    },
    isOperational: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Workstation', workstationSchema);
