/**
 * YAWC - Yet Another Weather Card
 * Enhanced NWS Weather Card for Home Assistant
 * 
 * @version 1.0.0
 * @author YAWC Team
 * @license MIT
 */

console.log('🌦️ YAWC: Starting to load...');

// Define the class first
class YetAnotherWeatherCard extends HTMLElement {
  constructor() {
    super();
    console.log('🌦️ YAWC: Constructor called');
    
    // Ensure methods are immediately available
    this.setConfig = this.setConfig.bind(this);
    this.fetchWeatherData = this.fetchWeatherData.bind(this);
    
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this.config = null;
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
    
    console.log('🌦️ YAWC: Config set, calling render');
    this.render();
  }

  set hass(hass) {
    console.log('🌦️ YAWC: hass setter called');
    this._hass = hass;
    if (this.config) {
      this.fetchWeatherData();
    }
  }

  get hass() {
    return this._hass;
  }

  render() {
    console.log('🌦️ YAWC: render called');
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        .card {
          background: var(--card-background-color, #fff);
          border-radius: var(--ha-card-border-radius, 8px);
          box-shadow: var(--ha-card-box-shadow, 0 2px 4px rgba(0,0,0,0.1));
          padding: 16px;
          margin: 8px 0;
        }
        .header {
          font-size: 1.3em;
          font-weight: bold;
          margin-bottom: 16px;
          color: var(--primary-text-color, #333);
        }
        .loading {
          text-align: center;
          color: var(--secondary-text-color, #666);
          padding: 20px;
        }
        .temp {
          font-size: 3em;
          font-weight: bold;
          text-align: center;
          color: var(--primary-text-color, #333);
          margin: 20px 0;
        }
        .condition {
          text-align: center;
          font-size: 1.2em;
          color: var(--secondary-text-color, #666);
          margin-bottom: 20px;
        }
        .details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
          margin-top: 20px;
        }
        .detail {
          text-align: center;
          padding: 12px;
          background: var(--secondary-background-color, #f5f5f5);
          border-radius: 8px;
        }
        .detail-label {
          font-size: 0.9em;
          color: var(--secondary-text-color, #666);
          margin-bottom: 4px;
        }
        .detail-value {
          font-size: 1.1em;
          font-weight: bold;
          color: var(--primary-text-color, #333);
        }
        .error {
          color: var(--error-color, #f44336);
          text-align: center;
          padding: 20px;
        }
        .branding {
          text-align: center;
          margin-top: 16px;
          font-size: 0.8em;
          color: var(--secondary-text-color, #666);
          border-top: 1px solid var(--divider-color, #e0e0e0);
          padding-top: 8px;
        }
      </style>
      <div class="card">
        <div class="header">${this.config.title}</div>
        <div class="content">
          <div class="loading">🌦️ Loading YAWC weather data...</div>
        </div>
        ${this.config.show_branding ? '<div class="branding">YAWC v1.0.0 - Yet Another Weather Card</div>' : ''}
      </div>
    `;
  }

  async fetchWeatherData() {
    console.log('🌦️ YAWC: Fetching weather data...');
    
    try {
      const contentEl = this.shadowRoot.querySelector('.content');
      
      // Get grid point for coordinates
      const pointResponse = await fetch(
        `https://api.weather.gov/points/${this.config.latitude},${this.config.longitude}`
      );
      
      if (!pointResponse.ok) {
        throw new Error(`NWS API error: ${pointResponse.status}`);
      }
      
      const pointData = await pointResponse.json();
      console.log('🌦️ YAWC: Point data received');

      // Get observation stations
      const stationsResponse = await fetch(pointData.properties.observationStations);
      if (!stationsResponse.ok) {
        throw new Error('Failed to get observation stations');
      }
      
      const stationsData = await stationsResponse.json();
      
      let currentConditions = {};
      if (stationsData.features && stationsData.features.length > 0) {
        const stationUrl = stationsData.features[0].id;
        console.log('🌦️ YAWC: Using station:', stationUrl);
        
        const currentResponse = await fetch(`${stationUrl}/observations/latest`);
        if (currentResponse.ok) {
          const currentData = await currentResponse.json();
          currentConditions = currentData.properties;
          console.log('🌦️ YAWC: Current conditions received');
        }
      }

      // Format and display data
      const temp = this.formatTemperature(currentConditions.temperature);
      const condition = currentConditions.textDescription || 'Unknown';
      const humidity = currentConditions.relativeHumidity?.value ? 
        Math.round(currentConditions.relativeHumidity.value) + '%' : 'N/A';
      const windSpeed = currentConditions.windSpeed?.value ? 
        Math.round(currentConditions.windSpeed.value) + ' mph' : 'N/A';
      const pressure = currentConditions.barometricPressure?.value ? 
        (currentConditions.barometricPressure.value / 100).toFixed(2) + ' mb' : 'N/A';

      contentEl.innerHTML = `
        <div class="temp">${temp}</div>
        <div class="condition">${this.getWeatherIcon(condition)} ${condition}</div>
        <div class="details">
          <div class="detail">
            <div class="detail-label">Humidity</div>
            <div class="detail-value">${humidity}</div>
          </div>
          <div class="detail">
            <div class="detail-label">Wind</div>
            <div class="detail-value">${windSpeed}</div>
          </div>
          <div class="detail">
            <div class="detail-label">Pressure</div>
            <div class="detail-value">${pressure}</div>
          </div>
        </div>
      `;

      console.log('🌦️ YAWC: Weather data displayed successfully');
      
    } catch (error) {
      console.error('🌦️ YAWC: Error fetching weather data:', error);
      const contentEl = this.shadowRoot.querySelector('.content');
      contentEl.innerHTML = `<div class="error">Failed to load weather data: ${error.message}</div>`;
    }
  }

  formatTemperature(temp) {
    if (!temp || temp.value === null || temp.value === undefined) return 'N/A';
    
    let fahrenheit;
    if (temp.unitCode === 'wmoUnit:degC') {
      fahrenheit = (temp.value * 9/5) + 32;
    } else if (temp.unitCode === 'wmoUnit:degF') {
      fahrenheit = temp.value;
    } else {
      // Assume Celsius if unknown
      fahrenheit = (temp.value * 9/5) + 32;
    }
    
    return `${Math.round(fahrenheit)}°F`;
  }

  getWeatherIcon(condition) {
    const iconMap = {
      'clear': '☀️',
      'sunny': '☀️',
      'partly cloudy': '⛅',
      'cloudy': '☁️',
      'overcast': '☁️',
      'rain': '🌧️',
      'showers': '🌦️',
      'thunderstorms': '⛈️',
      'snow': '🌨️',
      'fog': '🌫️',
      'windy': '💨'
    };

    const conditionLower = (condition || '').toLowerCase();
    for (const key in iconMap) {
      if (conditionLower.includes(key)) {
        return iconMap[key];
      }
    }
    return '🌤️';
  }

  getCardSize() {
    return 3;
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

// Register the custom element immediately
if (!customElements.get('yawc')) {
  customElements.define('yawc', YetAnotherWeatherCard);
  console.log('🌦️ YAWC: Custom element defined successfully');
} else {
  console.log('🌦️ YAWC: Element already defined');
}

// Test that the element was registered correctly
setTimeout(() => {
  const testElement = customElements.get('yawc');
  if (testElement) {
    console.log('🌦️ YAWC: Element registration verified');
    console.log('🌦️ YAWC: setConfig method available:', typeof testElement.prototype.setConfig);
  } else {
    console.error('🌦️ YAWC: Element registration failed!');
  }
}, 100);

console.log('🌦️ YAWC: Custom element defined');

// Register with card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'yawc',
  name: 'YAWC - Yet Another Weather Card',
  description: 'Advanced NWS weather card',
  preview: true,
});

console.log('🌦️ YAWC: Added to custom cards registry');
console.log('🌦️ YAWC: Registration complete - element should be available as "yawc"');

console.info(
  '%c YAWC %c v1.0.0 ',
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);
