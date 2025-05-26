const mongoose = require('mongoose');
require('dotenv').config();
const DB = process.env.DB;

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(DB);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('Mongoose not connected', error);
        process.exit(1);
    }
};

module.exports = connectDB;
