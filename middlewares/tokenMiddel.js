const jwt = require('jsonwebtoken');
const UserModel = require('../Models/userSchema');

const tokenMiddelWare = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token missing or malformed' });
    }

    const token = authHeader.split(' ')[1];
    const secretKey = process.env.JWT_KEY || 'PasswordKey';

    const decoded = jwt.verify(token, secretKey);
    const user = await UserModel.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user; 
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token', error: error.message });
  }
};

module.exports = tokenMiddelWare;
