const axios = require('axios');

/**
 * Fetches live weather AND AQI data for a given set of coordinates.
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 */
const getWeatherData = async (lat, lon) => {
  const API_KEY = process.env.OPENWEATHER_API_KEY;
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;

  try {
    const response = await axios.get(url);
    const data = response.data;
    const mainCondition = data.weather[0].main;
    const temp = data.main.temp;
    const windSpeed = data.wind.speed; // km/h equivalent if units=metric
    
    // Categorize hazardous conditions based on Hyderabad's disaster profiles
    const hazardousConditions = ["Rain", "Thunderstorm", "Tornado", "Squall", "Dust", "Haze", "Drizzle"];
    
    // Logic to flag:
    // 1. Extreme Heat (Heatwave) > 42°C
    // 2. High Winds > 15 m/s (leads to uprooted trees/blocked roads)
    // 3. Active Precipitation (Flooding risk)
    const isExtremeWeather = 
      hazardousConditions.includes(mainCondition) || 
      temp > 42 || 
      windSpeed > 15;
    
    const weatherResult = {
      temp: Math.round(temp),
      condition: mainCondition,
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: windSpeed,
      isHazardous: isExtremeWeather
    };

    // 👇 NEW: Fetch the AQI data for these coordinates
    const aqiData = await getAQIData(lat, lon);

    // 👇 NEW: Run the compound hazards engine now that we have both!
    const compoundHazards = detectCompoundHazards(weatherResult, aqiData);

    // Return everything mapped together in a single object
    return {
      ...weatherResult,
      aqiData: aqiData, // 👈 Frontend will look here for zone.aqiData.aqi
      aqi: aqiData.aqi, // 👈 Fallback direct mapping just in case
      compoundHazards: compoundHazards
    };

  } catch (error) {
    console.error("Weather API Error:", error.message);
    // Return a structured fallback so the Grid doesn't break
    return { 
      temp: "--", 
      condition: "Offline", 
      description: "Service unavailable", 
      humidity: 0,
      isHazardous: false,
      aqi: "N/A", // 👈 Added fallback so it renders gracefully
      aqiData: { aqi: "N/A" },
      compoundHazards: [] // Fallback empty so React won't crash on map()
    };
  }
};

/**
 * ECOGUARD COMPOUND HAZARD ENGINE
 * Based on Algorithm 1: Multi-Sensor Correlation
 */
const detectCompoundHazards = (weather, aqiData) => {
  const hazards = [];
  
  // 1. Pre-Monsoon Dust Storm (Hyderabad Specific)
  // Logic: High Wind + High PM10
  if (weather.windSpeed > 15 && aqiData.pm10 > 300) {
    hazards.push({
      type: "Dust Storm",
      severity: "High",
      instruction: "Visibility low. Advice: Seal industrial ventilation in Patancheru."
    });
  }

  // 2. Wet-Bulb Heat Stress (Health Risk)
  // Logic: High Temp + High Humidity (Mentioned in PDF page 1)
  if (weather.temp > 40 && weather.humidity > 60) {
    hazards.push({
      type: "Extreme Heat Stress",
      severity: "Critical",
      instruction: "High humidity prevents sweat cooling. Urgent health risk."
    });
  }

  // 3. Photochemical Smog (HITEC City Profile)
  // Logic: Clear Skies (High UV) + High NO2/O3
  if (weather.condition === "Clear" && aqiData.no2 > 80) {
    hazards.push({
      type: "Photochemical Smog",
      severity: "Medium",
      instruction: "Secondary pollutant formation active in high-traffic zones."
    });
  }

  return hazards;
};

/**
 * Fetches live Air Pollution data for a given set of coordinates.
 * Powered by OpenWeatherMap Air Pollution API
 */
const getAQIData = async (lat, lon) => {
  const API_KEY = process.env.OPENWEATHER_API_KEY;
  const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;

  try {
    const response = await axios.get(url);
    const data = response.data.list[0];
    
    return {
      aqi: data.main.aqi, // Basic scale 1 to 5
      pm10: data.components.pm10,
      pm2_5: data.components.pm2_5,
      no2: data.components.no2,
      nh3: data.components.nh3,
      so2: data.components.so2
    };
  } catch (error) {
    console.error("AQI API Error:", error.message);
    // Fallback so the math doesn't crash if the API fails
    return { aqi: 0, pm10: 0, pm2_5: 0, no2: 0, nh3: 0, so2: 0 };
  }
};

module.exports = { getWeatherData, getAQIData, detectCompoundHazards };