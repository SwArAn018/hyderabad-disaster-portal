const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true, 
        unique: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    role: { 
        type: String, 
        enum: ['admin', 'worker', 'citizen'], 
        default: 'citizen' 
    },
    // Aadhaar is CRITICAL for your server.js duplicate check
    aadhaar: { 
        type: String, 
        sparse: true, 
        unique: true // Ensures one account per citizen
    },
    dept: { 
        type: String, 
        required: function() { return this.role !== 'citizen'; } 
    },
    phone: { 
        type: String, 
        required: true,
        unique: true // Prevents multiple accounts with same phone
    },
    // --- WORKER STATUS TRACKING ---
    isAvailable: { 
        type: Boolean, 
        default: true 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('User', UserSchema);