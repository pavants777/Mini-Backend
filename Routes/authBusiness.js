const express = require('express');
const BusinessModel = require('../Models/Business'); // ✅ Use the correct model
const jwt = require('jsonwebtoken');
const OtpModel = require('../Models/otp.Schema');
const { sendMessageToPhone } = require('../Config/telegram.connect');
const router = express.Router();
const tokenMiddelWare = require('../middlewares/tokenBusines');
const ServiceRequest = require('../Models/serviceSchema')

// ✅ SIGNUP ROUTE
router.post('/signup', async (req, res) => {
  try {
    const { phoneNumber, password, name, latitude, longitude, shopName, isAvailable } = req.body;

    const existingUser = await BusinessModel.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(400).json({ message: "User with this phoneNumber already exists" });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({ message: "Latitude and Longitude are required" });
    }

    const location = {
      type: 'Point',
      coordinates: [parseFloat(longitude), parseFloat(latitude)],
    };

    const user = new BusinessModel({
      name,
      phoneNumber,
      password,
      location,
      shopName,
      isAvailable,
    });

    await user.save();

    const secretKey = process.env.JWT_KEY || "PasswordKey";
    const token = jwt.sign({ userId: user._id }, secretKey, { expiresIn: '30d' });

    const userWithoutPassword = await BusinessModel.findById(user._id).select("-password");

    res.status(200).json({ message: "Access granted", token, user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ SEND OTP ROUTE
router.post('/send-otp', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token missing or malformed' });
    }

    const token = authHeader.split(' ')[1];
    const secretKey = process.env.JWT_KEY || 'PasswordKey';
    const decoded = jwt.verify(token, secretKey);

    const user = await BusinessModel.findById(decoded.userId).select('phoneNumber');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const phoneNumber = user.phoneNumber;
    await OtpModel.deleteMany({ phoneNumber });

    const otp = Math.floor(1000 + Math.random() * 9000); // 4-digit OTP
    const newOtpReq = new OtpModel({ phoneNumber, otp });
    await newOtpReq.save();

    await sendMessageToPhone(phoneNumber, `Your OTP is: ${otp}`, res);
  } catch (error) {
    console.error("OTP send error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ✅ VERIFY OTP ROUTE
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

    const user = await BusinessModel.findById(decoded.userId);
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

    const updatedUser = await BusinessModel.findByIdAndUpdate(
      decoded.userId,
      { isVerified: true },
      { new: true }
    );

    res.status(200).json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('OTP verify error:', error);
    res.status(500).json({ message: 'Server error during OTP verification' });
  }
});

// ✅ SIGNIN ROUTE
router.post('/signin', async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    const existingUser = await BusinessModel.findOne({ phoneNumber });
    if (!existingUser) {
      return res.status(400).json({ message: "User Not Found" });
    }

    if (password !== existingUser.password) {
      return res.status(400).json({ message: "Password is invalid" });
    }

    const secretKey = process.env.JWT_KEY || "PasswordKey";
    const token = jwt.sign({ userId: existingUser._id }, secretKey, { expiresIn: '30d' });

    const userWithoutPassword = await BusinessModel.findById(existingUser._id).select("-password");

    res.status(200).json({ message: "Access granted", token, user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/validate', tokenMiddelWare, (req, res) => {
  console.log(req.token);
  res.json({ message: "Access granted", token: req.token, user: req.user });
});

router.post('/getRequest', async (req, res) => {
  const { longitude, latitude } = req.body;

  try {
    const requests = await ServiceRequest.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          distanceField: 'distance',
          maxDistance: 5000, // 5 km
          spherical: true,
          query: { isAccepted: false },
        },
      },
    ]);
    res.status(200).json(requests);
  } catch (error) {
    console.error('Geo query failed:', error);
    res.status(500).json({ error: 'Failed to get nearby requests' });
  }
});



module.exports = router;
