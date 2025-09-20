/**
 * YAWC - Yet Another Weather Card
 * Enhanced NWS Weather Card for Home Assistant
 * 
 * @version 1.0.0
 * @author YAWC Team
 * @license MIT
 */

console.log('🌦️ YAWC: Fresh load starting...');

class YetAnotherWeatherCard extends HTMLElement {
  constructor() {
    super();
    console.log('🌦️ YAWC: HTMLElement constructor called');
    
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this.config = null;
    this.isConfigured = false;
  }

  setConfig(config) {
    console.log('🌦️ YAWC: setConfig called with:', config);
    
    if (!config) {
      throw new Error('Invalid configuration');
    }
    
    if (!config.latitude || !config.longitude) {
      throw new Error('You must specify latitude and longitude');
    }
    
    this.config = {
      title: 'YAWC Weather',
      show_branding: true,
      ...config
    };
    
    this.isConfigured = true;
    console.log('🌦️ YAWC: Configuration complete');
    this.render();
  }

  set hass(hass) {
    console.log('🌦️ YAWC: hass setter called');
    this._hass = hass;
    if (this.isConfigured && this.config) {
      this.fetchWeatherData();
    }
  }

  get hass() {
    return this._hass;
  }

  render() {
    console.log('🌦️ YAWC: Rendering card');
    
    if (!this.shadowRoot) {
      console.error('🌦️ YAWC: Shadow root not available');
      return;
    }
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        .yawc-card {
          background: var(--card-background-color, #ffffff);
          border-radius: var(--ha-card-border-radius, 12px);
          box-shadow: var(--ha-card-box-shadow, 0 2px 8px rgba(0,0,0,0.1));
          padding: 20px;
          margin: 8px 0;
          font-family: var(--primary-font-family, sans-serif);
        }
        .yawc-header {
          font-size: 1.4em;
          font-weight: bold;
          margin-bottom: 20px;
          color: var(--primary-text-color, #333333);
          text-align: center;
        }
        .yawc-content {
          min-height: 100px;
        }
        .yawc-loading {
          text-align: center;
          color: var(--secondary-text-color, #666666);
          padding: 30px;
          font-size: 1.1em;
        }
        .yawc-temp {
          font-size: 3.5em;
          font-weight: bold;
          text-align: center;
          color: var(--primary-text-color, #333333);
          margin: 25px 0;
          line-height: 1;
        }
        .yawc-condition {
          text-align: center;
          font-size: 1.3em;
          color: var(--secondary-text-color, #666666);
          margin-bottom: 25px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .yawc-icon {
          font-size: 1.5em;
        }
        .yawc-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 15px;
          margin-top: 25px;
        }
        .yawc-detail {
          text-align: center;
          padding: 15px;
          background: var(--secondary-background-color, #f8f9fa);
          border-radius: 10px;
          border: 1px solid var(--divider-color, #e0e0e0);
        }
        .yawc-detail-label {
          font-size: 0.9em;
          color: var(--secondary-text-color, #666666);
          margin-bottom: 8px;
          font-weight: 500;
        }
        .yawc-detail-value {
          font-size: 1.2em;
          font-weight: bold;
          color: var(--primary-text-color, #333333);
        }
        .yawc-error {
          color: var(--error-color, #f44336);
          text-align: center;
          padding: 25px;
          background: rgba(244, 67, 54, 0.1);
          border-radius: 8px;
          border: 1px solid var(--error-color, #f44336);
        }
        .yawc-branding {
          text-align: center;
          margin-top: 20px;
          padding-top: 15px;
          font-size: 0.8em;
          color: var(--secondary-text-color, #666666);
          border-top: 1px solid var(--divider-color, #e0e0e0);
          opacity: 0.7;
        }
        .yawc-location {
          text-align: center;
          font-size: 0.9em;
          color: var(--secondary-text-color, #666666);
          margin-bottom: 15px;
        }
      </style>
      <div class="yawc-card">
        <div class="yawc-header">${this.config.title}</div>
        <div class="yawc-location">📍 ${this.config.latitude.toFixed(4)}, ${this.config.longitude.toFixed(4)}</div>
        <div class="yawc-content">
          <div class="yawc-loading">
            <div>🌦️ Loading weather data...</div>
            <div style="font-size: 0.9em; margin-top: 10px; opacity: 0.7;">Connecting to National Weather Service</div>
          </div>
        </div>
        ${this.config.show_branding ? '<div class="yawc-branding">YAWC v1.0.0 - Yet Another Weather Card</div>' : ''}
      </div>
    `;
  }

  async fetchWeatherData() {
    console.log('🌦️ YAWC: Starting weather data fetch...');
    
    const contentEl = this.shadowRoot?.querySelector('.yawc-content');
    if (!contentEl) {
      console.error('🌦️ YAWC: Content element not found');
      return;
    }
    
    try {
      console.log(`🌦️ YAWC: Fetching data for ${this.config.latitude}, ${this.config.longitude}`);
      
      // Get grid point for coordinates
      const pointUrl = `https://api.weather.gov/points/${this.config.latitude},${this.config.longitude}`;
      console.log('🌦️ YAWC: Calling NWS points API:', pointUrl);
      
      const pointResponse = await fetch(pointUrl);
      if (!pointResponse.ok) {
        throw new Error(`NWS Points API error: ${pointResponse.status} - ${pointResponse.statusText}`);
      }
      
      const pointData = await pointResponse.json();
      console.log('🌦️ YAWC: Point data received:', pointData.properties);

      // Get observation stations
      const stationsUrl = pointData.properties.observationStations;
      console.log('🌦️ YAWC: Fetching stations from:', stationsUrl);
      
      const stationsResponse = await fetch(stationsUrl);
      if (!stationsResponse.ok) {
        throw new Error(`Stations API error: ${stationsResponse.status}`);
      }
      
      const stationsData = await stationsResponse.json();
      console.log('🌦️ YAWC: Found', stationsData.features?.length || 0, 'stations');
      
      let currentConditions = {};
      let stationName = 'Unknown';
      
      if (stationsData.features && stationsData.features.length > 0) {
        const station = stationsData.features[0];
        const stationUrl = station.id;
        stationName = station.properties?.name || station.properties?.stationIdentifier || 'Unknown';
        
        console.log('🌦️ YAWC: Using station:', stationName, stationUrl);
        
        const currentResponse = await fetch(`${stationUrl}/observations/latest`);
        if (currentResponse.ok) {
          const currentData = await currentResponse.json();
          currentConditions = currentData.properties;
          console.log('🌦️ YAWC: Current conditions received from', stationName);
        } else {
          console.warn('🌦️ YAWC: Could not get current conditions:', currentResponse.status);
        }
      } else {
        console.warn('🌦️ YAWC: No observation stations found');
      }

      // Format and display data
      const temp = this.formatTemperature(currentConditions.temperature);
      const condition = currentConditions.textDescription || 'Conditions Unknown';
      const humidity = this.formatHumidity(currentConditions.relativeHumidity);
      const wind = this.formatWind(currentConditions.windSpeed, currentConditions.windDirection);
      const pressure = this.formatPressure(currentConditions.barometricPressure);
      const feelsLike = this.formatTemperature(
        currentConditions.heatIndex || 
        currentConditions.windChill || 
        currentConditions.temperature
      );

      contentEl.innerHTML = `
        <div class="yawc-temp">${temp}</div>
        <div class="yawc-condition">
          <span class="yawc-icon">${this.getWeatherIcon(condition)}</span>
          <span>${condition}</span>
        </div>
        <div class="yawc-details">
          <div class="yawc-detail">
            <div class="yawc-detail-label">Feels Like</div>
            <div class="yawc-detail-value">${feelsLike}</div>
          </div>
          <div class="yawc-detail">
            <div class="yawc-detail-label">Humidity</div>
            <div class="yawc-detail-value">${humidity}</div>
          </div>
          <div class="yawc-detail">
            <div class="yawc-detail-label">Wind</div>
            <div class="yawc-detail-value">${wind}</div>
          </div>
          <div class="yawc-detail">
            <div class="yawc-detail-label">Pressure</div>
            <div class="yawc-detail-value">${pressure}</div>
          </div>
        </div>
        <div style="text-align: center; margin-top: 15px; font-size: 0.8em; color: var(--secondary-text-color, #666); opacity: 0.8;">
          Data from ${stationName} • Updated ${new Date().toLocaleTimeString()}
        </div>
      `;

      console.log('🌦️ YAWC: Weather data displayed successfully');
      
    } catch (error) {
      console.error('🌦️ YAWC: Error fetching weather data:', error);
      contentEl.innerHTML = `
        <div class="yawc-error">
          <div style="font-size: 1.2em; margin-bottom: 10px;">⚠️ Weather Data Unavailable</div>
          <div style="margin-bottom: 10px;">${error.message}</div>
          <div style="font-size: 0.9em; opacity: 0.8;">Please check your coordinates and internet connection</div>
        </div>
      `;
    }
  }

  formatTemperature(temp) {
    if (!temp || temp.value === null || temp.value === undefined) {
      return 'N/A';
    }
    
    let fahrenheit;
    if (temp.unitCode === 'wmoUnit:degC') {
      fahrenheit = (temp.value * 9/5) + 32;
    } else if (temp.unitCode === 'wmoUnit:degF') {
      fahrenheit = temp.value;
    } else if (temp.unitCode === 'wmoUnit:K') {
      fahrenheit = (temp.value - 273.15) * 9/5 + 32;
    } else {
      // Assume Celsius if unknown
      fahrenheit = (temp.value * 9/5) + 32;
    }
    
    return `${Math.round(fahrenheit)}°F`;
  }

  formatHumidity(humidity) {
    if (!humidity || humidity.value === null || humidity.value === undefined) {
      return 'N/A';
    }
    return `${Math.round(humidity.value)}%`;
  }

  formatWind(speed, direction) {
    if (!speed || speed.value === null || speed.value === undefined) {
      return 'N/A';
    }
    
    let mph;
    if (speed.unitCode === 'wmoUnit:kmh') {
      mph = speed.value * 0.621371;
    } else if (speed.unitCode === 'wmoUnit:ms') {
      mph = speed.value * 2.237;
    } else {
      mph = speed.value; // Assume already in mph
    }
    
    let windText = `${Math.round(mph)} mph`;
    
    if (direction && direction.value !== null) {
      const degrees = Math.round(direction.value);
      const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
      const directionText = directions[Math.round(degrees / 22.5) % 16];
      windText += ` ${directionText}`;
    }
    
    return windText;
  }

  formatPressure(pressure) {
    if (!pressure || pressure.value === null || pressure.value === undefined) {
      return 'N/A';
    }
    
    let inHg;
    if (pressure.unitCode === 'wmoUnit:Pa') {
      inHg = pressure.value * 0.0002953;
    } else if (pressure.unitCode === 'wmoUnit:hPa') {
      inHg = pressure.value * 0.02953;
    } else {
      inHg = pressure.value * 0.0002953; // Assume Pascals
    }
    
    return `${inHg.toFixed(2)} inHg`;
  }

  getWeatherIcon(condition) {
    if (!condition) return '🌤️';
    
    const iconMap = {
      'clear': '☀️',
      'sunny': '☀️',
      'fair': '🌤️',
      'partly cloudy': '⛅',
      'mostly cloudy': '🌥️',
      'cloudy': '☁️',
      'overcast': '☁️',
      'rain': '🌧️',
      'showers': '🌦️',
      'drizzle': '🌦️',
      'thunderstorms': '⛈️',
      'thunder': '⛈️',
      'snow': '🌨️',
      'sleet': '🌨️',
      'fog': '🌫️',
      'mist': '🌫️',
      'haze': '🌫️',
      'windy': '💨',
      'breezy': '💨'
    };

    const conditionLower = condition.toLowerCase();
    for (const [key, icon] of Object.entries(iconMap)) {
      if (conditionLower.includes(key)) {
        return icon;
      }
    }
    
    return '🌤️'; // Default icon
  }

  getCardSize() {
    return 4;
  }

  static getStubConfig() {
    return {
      title: 'YAWC Weather',
      latitude: 40.8136,
      longitude: -96.7026,
      show_branding: true
    };
  }
}

// Register the custom element
if (!customElements.get('yawc')) {
  customElements.define('yawc', YetAnotherWeatherCard);
  console.log('🌦️ YAWC: Custom element registered successfully');
} else {
  console.log('🌦️ YAWC: Element already registered');
}

// Register with card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'yawc',
  name: 'YAWC - Yet Another Weather Card',
  description: 'Enhanced NWS weather card for Home Assistant',
  preview: true,
});

console.log('🌦️ YAWC: Card registration complete');

// Verify registration
setTimeout(() => {
  const element = customElements.get('yawc');
  if (element) {
    console.log('🌦️ YAWC: ✅ Registration verified - element is available');
    console.log('🌦️ YAWC: ✅ setConfig method type:', typeof element.prototype.setConfig);
  } else {
    console.error('🌦️ YAWC: ❌ Registration failed');
  }
}, 100);

console.info(
  '%c YAWC %c v1.0.0 %c HTMLElement Ready! ',
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
  'color: white; font-weight: bold; background: green'
);
