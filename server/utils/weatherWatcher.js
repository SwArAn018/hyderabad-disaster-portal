const Alert = require('../models/Alert');
const { getWeatherData } = require('./weather');
const checkWeatherAndAlert = async () => {
  try {
    // 1. Expanded Zone List (Aligned with your Dashboard Grid)
    const zones = [
      { areaName: "Hitech City", lat: 17.4483, lon: 78.3915, type: "Industrial" },
      { areaName: "Charminar", lat: 17.3616, lon: 78.4747, type: "Residential" },
      { areaName: "Secunderabad", lat: 17.4399, lon: 78.4983, type: "Residential" },
      { areaName: "Banjara Hills", lat: 17.4175, lon: 78.4433, type: "Residential" },
      { areaName: "Uppal", lat: 17.4022, lon: 78.5601, type: "Industrial" },
      { areaName: "Kukatpally", lat: 17.4948, lon: 78.3997, type: "Residential" },
      { areaName: "Patancheru", lat: 17.5236, lon: 78.2674, type: "Industrial" },
      { areaName: "Jeedimetla", lat: 17.5133, lon: 78.4608, type: "Industrial" },
      { areaName: "Falaknuma", lat: 17.3304, lon: 78.4682, type: "Residential" },
      { areaName: "Moosapet", lat: 17.4697, lon: 78.4239, type: "Residential" }
    ];

    console.log("🌦️ AI Watcher: Scanning 10 city zones for proactive hazards...");

    for (const zone of zones) {
      // Pass zone-specific data to get specialized AQI/Weather logic
      console.log(`📡 Fetching API for ${zone.areaName} -> Lat: ${zone.lat}, Lon: ${zone.lon}`);
      const weather = await getWeatherData(zone.lat, zone.lon, zone.type, zone.areaName);

      if (weather && weather.isHazardous) {
        const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
        
        // Look for any automated alert in THIS specific zone recently to prevent spam
        const existingAlert = await Alert.findOne({
          area: zone.areaName,
          title: { $regex: "Weather Warning|Severe Weather Alert" },
          timestamp: { $gte: threeHoursAgo }
        });

        if (!existingAlert) {
          // --- YOUR DYNAMIC SEVERITY LOGIC ---
          let severity = "Orange";
          let title = `Weather Warning: ${zone.areaName}`;
          
          if (["Thunderstorm", "Tornado", "Squall", "Extreme Heat Wave"].includes(weather.condition)) {
            severity = "Red"; 
            title = `URGENT: Severe Alert in ${zone.areaName}`;
          }

          const newAlert = new Alert({
            title: title,
            message: `AI System Detection: ${weather.condition.toUpperCase()} reported in ${zone.areaName}. Temp: ${weather.temp}°C. Zone Type: ${zone.type}.`,
            severity: severity,
            area: zone.areaName,
            isActive: true, 
            expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000) 
          });

          await newAlert.save();
          console.log(`📢 ${severity} Proactive Alert Created for ${zone.areaName}`);
        }
      }
    }
  } catch (err) {
    console.error("Watcher Error:", err.message);
  }
};

module.exports = { checkWeatherAndAlert };