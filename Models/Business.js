const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is Required"],
  },
  shopName: {
    type: String,
    required: [true, "Shop Name is Required"],
  },
  phoneNumber: {
    type: String,
    required: [true, "Phone Number is Required"],
    unique: true,
  },
  password: {
    type: String,
    required: [true, "Password is Required"],
    validate: {
      validator: function (password) {
        return password.length >= 8;
      },
      message: "Password must be at least 8 characters long",
    },
  },
  isAvailable: {
    type: Boolean,
    default: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  socketId: {
    type: String,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      validate: {
        validator: function (value) {
          if (!value) return true;
          return (
            Array.isArray(value) &&
            value.length === 2 &&
            value.every(coord => typeof coord === 'number' && !isNaN(coord))
          );
        },
        message: 'Coordinates must be an array of two numbers',
      },
    },
  },
  isBusiness: {
    type: Boolean,
    default: false,
  },
});

// Create 2dsphere index on location field
businessSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Business', businessSchema);
