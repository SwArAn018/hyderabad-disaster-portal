const axios = require('axios');

/**
 * Fetches live weather data for a given set of coordinates.
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
    
    return {
      temp: Math.round(temp), // Clean integer for the UI Grid
      condition: mainCondition,
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: windSpeed,
      isHazardous: isExtremeWeather
    };
  } catch (error) {
    console.error("Weather API Error:", error.message);
    // Return a structured fallback so the Grid doesn't break
    return { 
      temp: "--", 
      condition: "Offline", 
      description: "Service unavailable", 
      humidity: 0,
      isHazardous: false 
    };
  }
};

module.exports = { getWeatherData };