const axios = require('axios');

/**
 * Fetches live weather AND AQI data for a given set of coordinates.
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} zoneType - "Industrial" or "Residential" (NEW)
 * @param {string} areaName - Name of the zone (NEW)
 */
const getWeatherData = async (lat, lon, zoneType = "Residential", areaName = "Unknown Zone") => {
  const API_KEY = process.env.OPENWEATHER_API_KEY;
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;

  try {
    const response = await axios.get(url);
    const data = response.data;
    const mainCondition = data.weather[0].main;
    const temp = data.main.temp;
    const windSpeed = data.wind.speed; 
    
    const hazardousConditions = ["Rain", "Thunderstorm", "Tornado", "Squall", "Dust", "Haze", "Drizzle"];
    
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

    // Fetch the AQI data
    const aqiData = await getAQIData(lat, lon);

    const compoundHazards = detectCompoundHazards(weatherResult, aqiData, zoneType, areaName);

    return {
      ...weatherResult,
      aqiData: aqiData, 
      aqi: aqiData.aqi, 
      compoundHazards: compoundHazards,
      zoneType: zoneType 
    };

  } catch (error) {
    console.error("Weather API Error:", error.message);
    return { 
      temp: "--", 
      condition: "Offline", 
      description: "Service unavailable", 
      humidity: 0,
      isHazardous: false,
      aqi: 1, // FIXED: Keeping it as integer (Scale: 1-5)
      aqiData: { aqi: 1, pm10: 0, pm2_5: 0, no2: 0, nh3: 0, so2: 0 }, // FIXED
      compoundHazards: [],
      zoneType: zoneType
    };
  }
};

/**
 * ECOGUARD COMPOUND HAZARD ENGINE
 * Based on Algorithm 1: Multi-Sensor Correlation
 */
const detectCompoundHazards = (weather, aqiData, zoneType, areaName) => {
  const hazards = [];
  
  // 1. Pre-Monsoon Dust Storm (Hyderabad Specific)
  // Logic: High Wind + High PM10
  if (weather.windSpeed > 15 && aqiData.pm10 > 300) {
    hazards.push({
      type: "Dust Storm",
      severity: "High",
      instruction: `Visibility low. Advice: Seal industrial ventilation in ${areaName}.`
    });
  }

  // 2. Wet-Bulb Heat Stress (Health Risk)
  if (weather.temp > 40 && weather.humidity > 60) {
    hazards.push({
      type: "Extreme Heat Stress",
      severity: "Critical",
      instruction: "High humidity prevents sweat cooling. Urgent health risk."
    });
  }

  // 3. Photochemical Smog (HITEC City Profile)
  if (weather.condition === "Clear" && aqiData.no2 > 80) {
    hazards.push({
      type: "Photochemical Smog",
      severity: "Medium",
      instruction: "Secondary pollutant formation active in high-traffic zones."
    });
  }

  // 4. STRICT RESIDENTIAL AIR THRESHOLD
  if (zoneType === "Residential" && aqiData.aqi >= 4) {
    hazards.push({
      type: "Severe Residential Pollution",
      severity: "High",
      instruction: `Vulnerable populations in ${areaName} (kids/elderly) should remain indoors.`
    });
  }

  // 5. INDUSTRIAL GAS DRIFT 
  if (zoneType === "Industrial" && weather.windSpeed > 12 && aqiData.so2 > 20) {
    hazards.push({
      type: "Toxic Gas Dispersion",
      severity: "High",
      instruction: `High winds may carry industrial emissions from ${areaName} to neighboring zones.`
    });
  }

  return hazards;
};

/**
 * Fetches live Air Pollution data for a given set of coordinates.
 */
const getAQIData = async (lat, lon) => {
  const API_KEY = process.env.OPENWEATHER_API_KEY;
  const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;

  try {
    const response = await axios.get(url);
    const data = response.data.list[0];
    
    return {
      aqi: data.main.aqi, 
      pm10: data.components.pm10,
      pm2_5: data.components.pm2_5,
      no2: data.components.no2,
      nh3: data.components.nh3,
      so2: data.components.so2
    };
  } catch (error) {
    console.error("AQI API Error:", error.message);
    // FIXED: Swapped 0 with 1 for the aqi scale base fallback
    return { aqi: 1, pm10: 0, pm2_5: 0, no2: 0, nh3: 0, so2: 0 };
  }
};

module.exports = { getWeatherData, getAQIData, detectCompoundHazards };