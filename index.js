const dotenv = require('dotenv');
const express = require('express');
const authRoutes = require('./Routes/authRoutes');
const { login } = require('./Config/telegram.connect');
const connectDB = require('./Config/db.conection');
const otpRoutes = require('./Routes/otpRoutes')
const initSocket = require('./Routes/serviceRoutes');
const http = require('http');
const authBusiness = require('./Routes/authBusiness')
const userService = require('./Routes/userService')
dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use('/otp', otpRoutes);
app.use('/auth', authRoutes);
app.use('/authBusiness',authBusiness);
app.use('/user',userService);

connectDB();

app.get('/', (req, res) => {
  res.status(200).json({ message : "Hello World" });
});

// Init Socket.IO
initSocket(server);

const PORT = process.env.PORT || 5010;

(async () => {
  // await login();
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  });
})();
