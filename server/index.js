require('dotenv').config(); // Change this from 'import' to 'require'
console.log("Checking DB URL:", process.env.MONGO_URI ? "Found ✅" : "Missing ❌");
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Report = require('./models/Report');
const User = require('./models/User');
const Alert = require('./models/Alert');
const { getWeatherData, getAQIData, detectCompoundHazards } = require('./utils/weather');
// Import the Weather Utility

const { checkWeatherAndAlert } = require('./utils/weatherWatcher');
const app = express();
app.use(express.json());
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Initialize automated weather watching
checkWeatherAndAlert();
setInterval(() => {
  checkWeatherAndAlert();
}, 1800000); // 30 minutes

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("✅ MongoDB Connected Successfully"))
.catch(err => console.log("❌ Connection Error:", err));

mongoose.connection.once('open', async () => {
  try {
    console.log("🛠️ Attempting to force create 2dsphere index...");
    await mongoose.connection.db.collection('reports').createIndex({ loc: "2dsphere" });
    console.log("✅ 2dsphere index verified/created successfully!");
  } catch (err) {
    console.error("❌ INDEX CREATION FAILED:", err.message);
    console.log("💡 Tip: Check if any report has an invalid 'loc' format.");
  }
});
// --- USER & AUTH ROUTES ---

app.post('/api/users', async (req, res) => {
    try {
        const { name, phone, aadhaar, role } = req.body;

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

// --- REPLACE THIS BLOCK ---
app.post('/api/reports', async (req, res) => {
  try {
    const { loc, type } = req.body;

    // 1. SENSING: Fetch Context (Weather & AQI)
    // Note: Assuming you have getAQIData implemented to support PDF Algorithm 1
    const weather = await getWeatherData(loc[0], loc[1]);
    const aqiData = typeof getAQIData === 'function' ? await getAQIData(loc[0], loc[1]) : { aqi: 0 };

    // 2. PROCESSING: AI Reliability & Compound Hazard Logic
    let trustScore = 70; // Baseline
    let trustReason = "Standard environmental match";

    // A. Check for Compound Hazards (PDF Algorithm 1)
    // This checks for Dust Storms, Heat Stress, etc.
    const calculatedHazards = detectCompoundHazards(weather, aqiData);
    const compoundMatch = calculatedHazards.find(h => 
      h.type.toLowerCase().includes(type.toLowerCase())
    );

    if (compoundMatch) {
      trustScore = 100;
      trustReason = `Validated by Compound Hazard Logic: ${compoundMatch.type}`;
    } 
    // B. Basic Weather Correlation (Springer/Validation Method)
    else if (weather && weather.condition !== "Offline") {
      const isRainy = ["Rain", "Thunderstorm", "Drizzle"].includes(weather.condition);
      const isVeryHot = weather.temp > 40;
      const isWindy = weather.windSpeed > 10;

      if (type === "Flooding") {
        if (isRainy) {
          trustScore = 98;
          trustReason = "High correlation with live precipitation data";
        } else if (weather.condition === "Clear") {
          trustScore = 35;
          trustReason = "Weather discrepancy: Flooding reported during clear skies";
        }
      } else if ((type === "Blocked Road" || type === "Infrastructure") && isWindy) {
        trustScore = 90;
        trustReason = "Validated by high wind speed sensors";
      } else if (type === "Heat Wave" && isVeryHot) {
        trustScore = 95;
        trustReason = "Confirmed by thermal sensors";
      }
    }

    // 3. RESPONDING: Construct object with AI Metadata
    const reportData = {
      ...req.body,
      // Auto-escalate severity if trust is very high or weather is hazardous
      severity: (weather?.isHazardous || trustScore > 90) ? "High" : (req.body.severity || "Medium"),
      reliabilityScore: trustScore,
      trustReason: trustReason,
      weatherContext: {
        ...weather,
        aqiSnapshot: aqiData.aqi // Snapshots the AQI at the time of report
      }
    };

    const newReport = new Report(reportData);
    await newReport.save();

    console.log(`🚀 AI Report: ${type} | Trust: ${trustScore}% | ${trustReason}`);
    res.status(201).json(newReport);

  } catch (err) {
    console.error("Report Save Error:", err);
    res.status(400).json({ message: "Failed: " + err.message });
  }
});

app.put('/api/reports/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: "Report not found" });

    let updateData = { ...req.body };

    // --- ENHANCED ARRIVAL LOGIC ---
    if (req.body.status === "Arrived") {
      const serverTime = new Date(); // The "True" time on the server
      const clientTime = new Date(); // The time the report was marked
      
      updateData.arrivalTimestamp = clientTime;

      // 1. --- TIMESTAMP INTEGRITY CHECK (New Feature) ---
      // We check if the phone's reported time matches the server time within 5 minutes
      if (req.body.clientTimestamp) {
        const reportedTime = new Date(req.body.clientTimestamp);
        // Calculate difference in minutes
        const timeDiff = Math.abs(serverTime - reportedTime) / 1000 / 60;

        if (timeDiff > 5) {
          console.warn(`🕒 FRAUD ALERT: Timestamp Manipulation detected for report ${req.params.id}`);
          // Add a flag to the database so the Admin knows
          updateData.timeAuditStatus = "Flagged: Manual Time Change Detected";
        } else {
          updateData.timeAuditStatus = "Verified";
        }
      }

      // 2. --- GEOSPATIAL AUDIT (Your Existing Logic) ---
      if (report.loc && req.body.workerLat && req.body.workerLon) {
        const distance = getDistanceFromLatLonInKm(
          req.body.workerLat, 
          req.body.workerLon, 
          report.loc[0], 
          report.loc[1] 
        );

        const isNear = distance <= 0.2; // 200 Meters
        
        updateData.verifiedLocation = {
          lat: req.body.workerLat,
          lng: req.body.workerLon,
          distanceFromSite: Math.round(distance * 1000),
          verificationStatus: isNear ? "Verified" : "Flagged"
        };

        console.log(`📍 Audit: Worker is ${Math.round(distance * 1000)}m from site. Status: ${isNear ? "✅" : "❌"}`);
      }
    }

    const updatedReport = await Report.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true }
    );
    
    res.json(updatedReport);
  } catch (err) {
    res.status(400).json({ message: "Update failed: " + err.message });
  }
});

// --- PROACTIVE ALERT ROUTES ---

app.get('/api/alerts', async (req, res) => {
  try {
    const currentTime = new Date();
    const activeAlerts = await Alert.find({
      isActive: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: currentTime } }
      ]
    }).sort({ timestamp: -1 });
    
    res.json(activeAlerts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/alerts', async (req, res) => {
  try {
    const newAlert = new Alert(req.body);
    await newAlert.save();
    console.log("📢 Proactive Alert Broadcasted:", newAlert.title);
    res.status(201).json(newAlert);
  } catch (err) {
    res.status(400).json({ message: "Alert broadcast failed: " + err.message });
  }
});

app.put('/api/alerts/:id/deactivate', async (req, res) => {
  try {
    const updated = await Alert.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.get('/test-weather', (req, res) => {
   checkWeatherAndAlert();
   res.send("Weather check triggered!");
});

// --- CITY OVERVIEW WEATHER ROUTE (THE GRID - UPDATED TO 10 ZONES) ---
app.get('/api/weather/overview', async (req, res) => {
  const zones = [
    { areaName: "Hitech City", lat: 17.4483, lon: 78.3915, zoneType: "Residential" },
    { areaName: "Charminar", lat: 17.3616, lon: 78.4747, zoneType: "Residential" },
    { areaName: "Secunderabad", lat: 17.4399, lon: 78.4983, zoneType: "Residential" },
    { areaName: "Banjara Hills", lat: 17.4175, lon: 78.4433, zoneType: "Residential" },
    { areaName: "Uppal", lat: 17.4022, lon: 78.5601, zoneType: "Residential" },
    { areaName: "Kukatpally", lat: 17.4948, lon: 78.3997, zoneType: "Residential" },
    { areaName: "Patancheru", lat: 17.5236, lon: 78.2674, zoneType: "Industrial" },
    { areaName: "Jeedimetla", lat: 17.5133, lon: 78.4608, zoneType: "Industrial" },
    { areaName: "Falaknuma", lat: 17.3304, lon: 78.4682, zoneType: "Residential" },
    { areaName: "Moosapet", lat: 17.4697, lon: 78.4239, zoneType: "Residential" }
  ];

  try {
    const overview = await Promise.all(zones.map(async (zone) => {
      // Fetch live weather using your existing utility
      const weather = await getWeatherData(zone.lat, zone.lon);
      
      // Count active incidents specifically for this zone's area
      const incidents = await Report.countDocuments({
        status: { $ne: "Resolved" },
        "loc.0": { $gte: zone.lat - 0.03, $lte: zone.lat + 0.03 },
        "loc.1": { $gte: zone.lon - 0.03, $lte: zone.lon + 0.03 }
      });

      return { 
        ...zone, 
        temp: weather?.temp || 0,
        condition: weather?.condition || "Clear",
        isHazardous: weather?.isHazardous || false,
        incidentCount: incidents,
        aqiData: { aqi: weather?.aqiData ? weather.aqiData.aqi : "N/A" },
        zoneType: zone.zoneType || "Residential" 
      };
    }));
    res.json(overview);
  } catch (err) {
    console.error("Weather Overview Error:", err);
    res.status(500).json({ message: "Overview fetch failed" });
  }
});
// --- GEOSPATIAL MATH HELPER ---
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c; 
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));