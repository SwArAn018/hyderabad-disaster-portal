const Alert = require('../models/Alert');
const { getWeatherData } = require('./weather');

const checkWeatherAndAlert = async () => {
  try {
    const lat = 17.3850;
    const lon = 78.4867;

    console.log("🌦️ Running Proactive Weather Check...");
    const weather = await getWeatherData(lat, lon);

    if (weather && weather.isHazardous) {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
      
      // Look for any automated alert in the last 3 hours
      const existingAlert = await Alert.findOne({
        title: { $regex: "Weather Warning" },
        timestamp: { $gte: threeHoursAgo }
      });

      if (!existingAlert) {
        // --- DYNAMIC SEVERITY LOGIC ---
        let severity = "Orange";
        let title = "Weather Warning";
        
        if (["Thunderstorm", "Tornado", "Squall"].includes(weather.condition)) {
          severity = "Red"; // Critical danger
          title = "URGENT: Severe Weather Alert";
        }

        const newAlert = new Alert({
          title: title,
          message: `Automatic Update: ${weather.description.toUpperCase()} reported. Temperature: ${weather.temp}°C. Avoid low-lying areas and stay indoors.`,
          severity: severity,
          area: "Hyderabad City",
          isActive: true, // Ensure this is true so it shows on dashboard
          expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000) 
        });

        await newAlert.save();
        console.log(`📢 ${severity} Alert Created: ${weather.condition}`);
      }
    }
  } catch (err) {
    console.error("Watcher Error:", err);
  }
};
module.exports = { checkWeatherAndAlert };