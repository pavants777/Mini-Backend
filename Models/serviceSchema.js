const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: String,
  phoneNumber: String,
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
  description: {
    type: String,
  },
  serviceType: String,
  isAccepted: {
    type: Boolean,
    default: false,
  },
  acceptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business', // Reference to Business model
    default: null,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400, // Document auto-deletes after 24 hours
  },
});

// Create 2dsphere index for geo queries
serviceSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('ServiceRequest', serviceSchema);
