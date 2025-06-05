const express = require('express');
const Business = require('../Models/Business')
const Router = express.Router();

Router.post('/near-shop',async (req,res)=>{
    const {  latitude, longitude,  } = req.body;
    
   try {
    const businesses = await Business.find({
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [longitude, latitude] },
            $maxDistance: 5000, 
          },
        },
      });
      res.status(200).json({businesses});
   } catch (error) {
      res.status(500).json({message : error.message})
   }
});

module.exports = Router;
