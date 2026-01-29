require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Report = require('./models/Report');
const User = require('./models/User');

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch(err => console.error("❌ Connection Error:", err));

// --- USER & AUTH ROUTES ---

app.post('/api/users', async (req, res) => {
    try {
        const { name, phone, aadhaar, role } = req.body;

        // 1. DYNAMIC CHECK: Look for existing users by Name, Phone, OR Aadhaar
        // We only check Aadhaar if the role is 'citizen'
        const query = [{ name }, { phone }];
        if (role === 'citizen' && aadhaar) {
            query.push({ aadhaar });
        }

        const existingUser = await User.findOne({ $or: query });
        
        if (existingUser) {
            let conflict = "Name or Phone";
            if (existingUser.aadhaar === aadhaar && role === 'citizen') conflict = "Aadhaar Number";
            return res.status(400).json({ message: `${conflict} already registered.` });
        }

        // 2. CREATE USER: req.body will now include aadhaar, address, and emergencyContact
        const newUser = new User(req.body);
        await newUser.save();
        
        res.status(201).json({ message: "Registration successful", user: newUser });
    } catch (err) {
        console.error("Registration Error:", err);
        res.status(400).json({ message: "Registration failed: " + err.message });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ name: username, password: password });
        if (user) {
            res.json({ message: "Login successful", user });
        } else {
            res.status(401).json({ message: "Invalid username or password" });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/users/workers', async (req, res) => {
    try {
        const workers = await User.find({ role: 'worker' });
        res.json(workers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- REPORT ROUTES ---

app.get('/api/reports', async (req, res) => {
  try {
    const reports = await Report.find().sort({ timestamp: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/reports', async (req, res) => {
  try {
    const newReport = new Report(req.body);
    await newReport.save();
    res.status(201).json(newReport);
  } catch (err) {
    console.error("Report Save Error:", err);
    res.status(400).json({ message: "Failed to submit report: " + err.message });
  }
});

app.put('/api/reports/:id', async (req, res) => {
  try {
    const updated = await Report.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));