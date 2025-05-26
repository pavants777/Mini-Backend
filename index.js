const dotenv = require('dotenv');
const express = require('express');
const authRoutes = require('./Routes/authRoutes');
const { login } = require('./Config/telegram.connect');
const connectDB = require('./Config/db.conection');
const otpRoutes = require('./Routes/otpRoutes')
dotenv.config();

const app = express();
app.use(express.json());
app.use('/otp', otpRoutes);
app.use('/auth', authRoutes);

connectDB();

app.get('/', (req, res) => {
  res.status(200).json({ message : "Hello World" });
});

const PORT = process.env.PORT;

(async () => {
  await login();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
})();
