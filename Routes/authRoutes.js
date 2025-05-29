const express = require('express');
const UserModel = require('../Models/userSchema');
const tokenMiddelWare = require('../middlewares/tokenMiddel')
const jwt = require('jsonwebtoken');
const router = express.Router(); 


router.post('/signup', async (req, res) => {
  try {
    const { phoneNumber, password, name } = req.body;

    const existingUser = await UserModel.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(400).json({ message: "User with this phoneNumber already exists" });
    }

    const user = new UserModel({ name, phoneNumber, password });
    await user.save();

    const secretKey = process.env.JWT_KEY || "PasswordKey";
    const token = jwt.sign({ userId: user._id }, secretKey, { expiresIn: '30d' });
    const userWithoutPassword = await UserModel.findById(user._id).select("-password");
    res.status(200).json({ message: "Access granted", token,user : userWithoutPassword });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.get('/validate', tokenMiddelWare, (req, res) => {
  res.json({ message: "Access granted", token: req.token, user: req.user });
});



router.post('/signin', async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;
    const existingUser = await UserModel.findOne({ phoneNumber });

    if (!existingUser) {
      return res.status(400).json({ message: "Account with this Phone Number is Not Existing" });
    }

    if (password !== existingUser.password) {
      return res.status(400).json({ message: "Password is invalid" });
    }

    const secretKey = process.env.JWT_KEY || "PasswordKey";
    const token = jwt.sign({ userId: existingUser._id }, secretKey, { expiresIn: '30d' });

    const userWithoutPassword = await UserModel.findById(existingUser._id).select("-password");

    res.status(200).json({ message: "Access granted", token, user: userWithoutPassword });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



module.exports = router;
