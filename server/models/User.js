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
        enum: ['admin', 'worker', 'citizen'], // Added 'citizen'
        default: 'citizen' // Changed default to citizen
    },
    dept: { 
        type: String, 
        required: function() { return this.role !== 'citizen'; } // Only required for workers/admins
    },
    phone: { 
        type: String, 
        required: true 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('User', UserSchema);