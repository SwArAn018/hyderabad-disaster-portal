const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true // e.g., "Heavy Rainfall Warning"
  },
  message: { 
    type: String, 
    required: true // e.g., "Low-lying areas in Khairatabad may face flooding."
  },
  severity: { 
    type: String, 
    enum: ["Yellow", "Orange", "Red"], // Warning levels
    default: "Yellow"
  },
  area: { 
    type: String, 
    default: "All Hyderabad" // Specific locality or city-wide
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
  expiresAt: { 
    type: Date // When the alert should automatically disappear
  }
});

module.exports = mongoose.model('Alert', AlertSchema);