const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  type: { 
    type: String, 
    required: true,
    enum: ["Flooding", "Blocked Road", "Garbage", "Power Outage", "Other"] 
  },
  loc: {
    type: [Number], // [lat, lng]
    required: true
  },
  status: { 
    type: String, 
    enum: ["Pending", "Assigned", "Accepted", "Arrived", "Submitted for Review", "Resolved"], 
    default: "Pending" 
  },
  // NEW: Added reporter details to match the frontend 'reporter' object
  reporter: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    pincode: String,
    landmark: String
  },
  // UPDATED: Structured to capture URLs and the dynamic 'details' from the form
  evidence: {
    img: String,
    vid: String,
    categoryDetails: { type: mongoose.Schema.Types.Mixed } // Stores waterLevel, area, blockType, etc.
  },
  worker: { type: String, default: "Unassigned" },
  severity: { type: String, default: "Medium" },
  timestamp: { type: Date, default: Date.now } // Using timestamp to match your frontend payload
});

module.exports = mongoose.model('Report', ReportSchema);