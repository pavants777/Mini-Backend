const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    name : {
        type : String,
        required : [true, "Name is Required"],
    },
    phoneNumber : {
        type : String,
        required : [true, "Phone Number is Required"],
        unique: true,
    },
    password : {
        type : String,
        required : [true, "Password is Required"],
        validate: {
            validator: function (password) {
                return password.length >= 8; 
            },
            message: "Password must be at least 8 characters long" 
        }
    },
    isVerfied : {
         type : Boolean,
         default : false,
    }
});

const user = mongoose.model('User',userSchema);
module.exports = user;