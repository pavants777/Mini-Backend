const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const UserModel = require('../Models/userSchema');
const OtpModel = require('../Models/otp.Schema');
const { sendMessageToPhone } = require('../Config/telegram.connect');

router.post('/send-otp', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token missing or malformed' });
    }

    const token = authHeader.split(' ')[1];
    const secretKey = process.env.JWT_KEY || 'PasswordKey';
    const decoded = jwt.verify(token, secretKey);

    const user = await UserModel.findById(decoded.userId).select('phoneNumber');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const phoneNumber = user.phoneNumber;
    await OtpModel.deleteMany({ phoneNumber });
    const otp = Math.floor(1000 + Math.random() * 9000);
    const newOtpReq = new OtpModel({ phoneNumber, otp });
    await newOtpReq.save();
    await sendMessageToPhone(phoneNumber, `Your OTP is: ${otp}`, res);

  } catch (error) {
    console.error("OTP send error:", error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/verify', async (req, res) => {
    try {
      const { otp } = req.body;
  
      if (!otp) {
        return res.status(400).json({ message: 'OTP is required' });
      }
  
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization token missing or malformed' });
      }
  
      const token = authHeader.split(' ')[1];
      const secretKey = process.env.JWT_KEY || 'PasswordKey';
      const decoded = jwt.verify(token, secretKey);
  
      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      const phoneNumber = user.phoneNumber;
      const otpRecord = await OtpModel.findOne({ phoneNumber });
  
      if (!otpRecord) {
        return res.status(400).json({ message: 'No OTP found for this phone number. Please request a new one.' });
      }
  
      if (otpRecord.otp !== otp) {
        return res.status(401).json({ message: 'Invalid OTP' });
      }
      await OtpModel.deleteOne({ phoneNumber });
      await UserModel.findByIdAndUpdate(decoded.userId, { isVerfied: true });
      res.status(200).json({ message: 'OTP verified successfully' });
    } catch (error) {
      console.error('OTP verify error:', error);
      res.status(500).json({ message: 'Server error during OTP verification' });
    }
  });
  


module.exports = router;
