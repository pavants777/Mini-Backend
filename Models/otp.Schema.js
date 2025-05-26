const mongoose = require('mongoose')

const OtpSchema = new mongoose.Schema({
    phoneNumber : {
        type : String,
        required : [true, "Phone number is required"],
    },
    otp : {
        type : String,
        required : [true, "Otp is required"],
    }
})

const otpModels = mongoose.model('otp',OtpSchema)
module.exports = otpModels;

