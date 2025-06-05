const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: String,
  phoneNumber: String,
  location: {
    latitude: Number,
    longitude: Number
  },
  description : {
    type : String,
  },
  serviceType: String,
  isAccepted: { type: Boolean, default: false },
  isCompleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, expires: 86400 }
});

module.exports = mongoose.model('ServiceRequest', serviceSchema);
