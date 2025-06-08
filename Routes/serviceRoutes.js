const socketIo = require('socket.io');
const Business = require('../Models/Business');
const ServiceRequest = require('../Models/serviceSchema');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

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
      const { name, phoneNumber, latitude, longitude } = data;
    
      try {
        const updateData = {
          name,
          socketId: socket.id,
        };
    
        if (
          typeof latitude === 'number' &&
          typeof longitude === 'number' &&
          !isNaN(latitude) &&
          !isNaN(longitude)
        ) {
          updateData.location = {
            type: 'Point',
            coordinates: [longitude, latitude],
          };
        }
    
        const business = await Business.findOneAndUpdate(
          { phoneNumber },
          { $set: updateData },
          { upsert: true, new: true }
        );
    
        // ✅ Correct reference to business.location and business._id
        if (business.location) {
          const requests = await ServiceRequest.aggregate([
            {
              $geoNear: {
                near: business.location,
                distanceField: 'distance',
                maxDistance: 5000,
                spherical: true,
                query: {
                  $or: [
                    { isAccepted: false },
                    { isAccepted: true, acceptedBy: business._id },
                  ],
                },
              },
            },
          ]);
    
          socket.emit('nearby-requests', requests);
        }
    
        console.log(`✅ Registered business: ${phoneNumber}`);
      } catch (err) {
        console.error('❌ Error registering business:', err.message);
      }
    });
    
    
    // Accept Request From 
    socket.on('on-accept', async (data) => {
      const { id, businessPhone } = data;
      try {
        const business = await Business.findOne({ phoneNumber: businessPhone });
        if (!business) {
          return socket.emit('error', { message: 'Business not found' });
        }
    
        const request = await ServiceRequest.findOneAndUpdate(
          { _id: new ObjectId(id), isAccepted: false }, 
          {
            $set: {
              isAccepted: true,
              acceptedBy: business._id,
            },
          },
          { new: true }
        );
        if (!request) {
          return socket.emit('error', { message: 'Request not found or already accepted' });
        }
    
        // ✅ Notify the accepted business
        io.emit('request-accepted', { success: true, request });

    
        // ✅ Notify other businesses to remove this request
        const allSockets = await io.fetchSockets();
        console.log('✅ allSockets fetched:', allSockets.length);

        for (let s of allSockets) {
          if (s.id === socket.id) {
            continue;
          }
          const otherBusinessPhone = s.handshake.query?.businessPhone;
          if (!otherBusinessPhone) {
            console.log('⚠️ Skipping socket due to missing businessPhone in handshake query');
            continue;
          }

          let otherBusiness;
          try {
            otherBusiness = await Business.findOne({ phoneNumber: otherBusinessPhone });
          } catch (e) {
            continue;
          }

          if (!otherBusiness || !otherBusiness.location || !business.location) {
            continue;
          }

          const dist = calculateDistance(
            business.location.coordinates[1], business.location.coordinates[0],
            otherBusiness.location.coordinates[1], otherBusiness.location.coordinates[0]
          );

          if (dist <= 5) {
            s.emit('remove-request', { requestId: id });
          }
        }
        console.log('✅ End - function');
    
      } catch (error) {
        console.error('❌ Error in on-accept:', error);
        socket.emit('error', { message: 'Something went wrong' });
      }
    });
    

    // User sends a service request
    socket.on('user-request', async (data) => {
      const { name, phoneNumber, latitude, longitude, serviceType, description } = data;

      if (
        typeof latitude !== 'number' || typeof longitude !== 'number' ||
        isNaN(latitude) || isNaN(longitude)
      ) {
        console.log("Received coords:", latitude, typeof latitude, longitude, typeof longitude);
        console.error("❌ Invalid user request location.");
        return;
      }

      try {
        const request = await ServiceRequest.create({
          name,
          phoneNumber,
          description,
          location: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          serviceType,
        });

        const businesses = await Business.find({
          location: {
            $near: {
              $geometry: { type: 'Point', coordinates: [longitude, latitude] },
              $maxDistance: 5000,
            },
          },
        });

        console.log(`📍 ${businesses.length} nearby businesses found`);

        businesses.forEach((business) => {
          if (business.socketId) {
            io.to(business.socketId).emit('new-service-request', request);
            console.log(`📨 Sent request to ${business.name}`);
          }
        });
        socket.emit('new-service-request',request);
      } catch (err) {
        console.error("❌ Error processing user request:", err.message);
      }
    });

    // Get user requests by phoneNumber
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
