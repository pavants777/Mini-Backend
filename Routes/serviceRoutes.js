// ./Routes/serviceRoutes.js
const socketIo = require('socket.io');
const Business = require('../Models/Business');
const ServiceRequest = require('../Models/serviceSchema');

function initSocket(server) {
  console.log('🧩 Initializing Socket.IO...');

  const io = socketIo(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    // Register business with location
    socket.on('register-business', async (data) => {
      const { name, phoneNumber} = data;
      try {
        await Business.findOneAndUpdate(
          { phoneNumber },
          {
            socketId: socket.id,
          },
          { upsert: true, new: true }
        );
      } catch (err) {
        // console.error("❌ Error registering business:", err.message);
      }
    });

    // User sends a service request
    socket.on('user-request', async (data) => {
      const { name, phoneNumber, latitude, longitude, serviceType,description } = data;

      if (
        typeof latitude !== 'number' || typeof longitude !== 'number' ||
        isNaN(latitude) || isNaN(longitude)
      ) {
        console.log("Received coords:", latitude, typeof latitude, longitude, typeof longitude);
        console.error("❌ Invalid user request location.");
        return;
      }

      try {
        // Save service request in DB
        const request = await ServiceRequest.create({
          name,
          phoneNumber,
          description,
          location: { latitude, longitude },
          serviceType,
        });

        // Find nearby businesses (within 5km)
        const businesses = await Business.find({
          location: {
            $near: {
              $geometry: { type: 'Point', coordinates: [longitude, latitude] },
              $maxDistance: 5000, 
            },
          },
        });

        console.log(`📍 ${businesses.length} nearby businesses found`);

        // Emit request to all matching business clients
        businesses.forEach((business) => {
          if (business.socketId) {
            io.to(business.socketId).emit('new-service-request', request);
            console.log(`📨 Sent request to ${business.name}`);
          }
        });
      } catch (err) {
        console.error("❌ Error processing user request:", err.message);
      }
    });

    //Get Users requests 
    socket.on('get-user-requests', async (phoneNumber) => {
      try {
        if (!phoneNumber || typeof phoneNumber !== 'string') {
          console.error("❌ Invalid phone number provided");
          socket.emit('user-requests-response', { error: 'Invalid phone number' });
          return;
        }
    
        const requests = await ServiceRequest.find({ phoneNumber }).sort({ createdAt: -1 });
    
        socket.emit('user-requests-response', {
          success: true,
          data: requests,
        });
    
        console.log(`📤 Sent ${requests.length} requests for phone number: ${phoneNumber}`);
      } catch (err) {
        console.error("❌ Error fetching user requests:", err.message);
        socket.emit('user-requests-response', {
          error: 'Server error while fetching requests',
        });
      }
    });
    

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log('❌ Client disconnected:', socket.id);
      try {
        await Business.findOneAndUpdate({ socketId: socket.id }, { socketId: null });
      } catch (err) {
        console.error("Error clearing socketId on disconnect:", err.message);
      }
    });
  });

}

module.exports = initSocket;
