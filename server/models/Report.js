const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  type: { 
    type: String, 
    required: true,
    enum: ["Flooding", "Blocked Road", "Garbage", "Power Outage", "Heat Wave", "Other"] 
  },
  loc: {
    type: [Number], // [longitude, latitude] 
    required: true,
    index: '2dsphere' // CRITICAL: Required for the $near query in your Weather Grid
  },
  status: { 
    type: String, 
    enum: ["Pending", "Assigned", "Accepted", "Arrived", "Submitted for Review", "Resolved"], 
    default: "Pending" 
  },
  reporter: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    pincode: String,
    landmark: String
  },
  
  // --- AI RELIABILITY & AUDIT FIELDS ---
  reliabilityScore: { type: Number, default: 70 }, 
  trustReason: { type: String, default: "Standard Report" }, 
  
  evidence: {
    img: String,
    vid: String,
    categoryDetails: { type: mongoose.Schema.Types.Mixed } 
  },
  
  weatherContext: {
    temp: { type: Number },
    condition: { type: String },
    isHazardous: { type: Boolean, default: false },
    fetchedAt: { type: Date, default: Date.now }
  },

  // --- WORKER VERIFICATION & RESOLUTION ---
  arrivalTimestamp: { type: Date }, 
  verifiedLocation: {
    lat: Number,
    lng: Number,
    distanceFromSite: Number, // Meters away from site
    verificationStatus: { type: String, default: "Pending" } // "Verified" or "Flagged"
  },

  worker: { type: String, default: "Unassigned" },
  severity: { type: String, default: "Medium" },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', ReportSchema);