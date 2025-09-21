console.info(
  '%c YAWC %c Yet Another Weather Card (NWS) v1.0.0 ',
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray'
);

class YetAnotherWeatherCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._weatherData = null;
    this._updateInterval = null;
  }

  setConfig(config) {
    if (!config) {
      throw new Error('Invalid configuration');
    }
    this._config = {
      update_interval: 600000, // 10 minutes default
      ...config
    };
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._weatherData) {
      this.fetchWeatherData();
    }
    this.render();
    this.startUpdateInterval();
  }

  connectedCallback() {
    this.startUpdateInterval();
  }

  disconnectedCallback() {
    this.stopUpdateInterval();
  }

  startUpdateInterval() {
    this.stopUpdateInterval();
    this._updateInterval = setInterval(() => {
      this.fetchWeatherData();
    }, this._config.update_interval);
  }

  stopUpdateInterval() {
    if (this._updateInterval) {
      clearInterval(this._updateInterval);
      this._updateInterval = null;
    }
  }

  async fetchWeatherData() {
    if (!this._hass) return;

    try {
      const latitude = this._config.latitude || this._hass.config.latitude;
      const longitude = this._config.longitude || this._hass.config.longitude;

      if (!latitude || !longitude) {
        throw new Error('No coordinates available');
      }

      // First, get the NWS office and grid coordinates
      const pointResponse = await fetch(`https://api.weather.gov/points/${latitude},${longitude}`);
      if (!pointResponse.ok) throw new Error('Failed to get NWS point data');
      
      const pointData = await pointResponse.json();
      const { gridX, gridY, office } = pointData.properties;
      const forecastUrl = pointData.properties.forecast;
      const forecastHourlyUrl = pointData.properties.forecastHourly;
      const observationStations = pointData.properties.observationStations;

      // Get current observations
      const stationsResponse = await fetch(observationStations);
      const stationsData = await stationsResponse.json();
      const nearestStation = stationsData.features[0]?.id;

      let currentData = null;
      if (nearestStation) {
        try {
          const obsResponse = await fetch(`${nearestStation}/observations/latest`);
          if (obsResponse.ok) {
            const obsData = await obsResponse.json();
            currentData = obsData.properties;
          }
        } catch (e) {
          console.warn('Failed to get current observations:', e);
        }
      }

      // Get forecast data
      const forecastResponse = await fetch(forecastUrl);
      const forecastData = await forecastResponse.json();

      this._weatherData = {
        current: currentData,
        forecast: forecastData.properties.periods,
        coordinates: { latitude, longitude },
        lastUpdated: new Date()
      };

      this.render();

    } catch (error) {
      console.error('Error fetching NWS weather data:', error);
      this._weatherData = { error: error.message };
      this.render();
    }
  }

  getCardSize() {
    return 4;
  }

  render() {
    if (!this._hass) return;

    const currentTime = new Date().toLocaleString();

    if (!this._weatherData) {
      this.shadowRoot.innerHTML = `
        <ha-card>
          <div style="padding: 16px; text-align: center;">
            <div>Loading weather data...</div>
            <div style="margin-top: 8px; font-size: 14px; color: var(--secondary-text-color);">${currentTime}</div>
          </div>
        </ha-card>
      `;
      return;
    }

    if (this._weatherData.error) {
      this.shadowRoot.innerHTML = `
        <ha-card>
          <div style="padding: 16px; color: var(--error-color);">
            <div>Error loading weather data:</div>
            <div style="font-size: 14px; margin-top: 8px;">${this._weatherData.error}</div>
            <div style="margin-top: 8px; font-size: 14px; color: var(--secondary-text-color);">${currentTime}</div>
          </div>
        </ha-card>
      `;
      return;
    }

    const { current, forecast } = this._weatherData;
    
    // Current weather data
    const temperature = current?.temperature?.value ? 
      Math.round(this.celsiusToUnit(current.temperature.value)) : 
      (forecast[0] ? this.extractTempFromText(forecast[0].temperature) : 'N/A');
    
    const condition = current?.textDescription || forecast[0]?.shortForecast || 'Unknown';
    const humidity = current?.relativeHumidity?.value ? Math.round(current.relativeHumidity.value) : null;
    const windSpeed = current?.windSpeed?.value ? Math.round(this.mpsToUnit(current.windSpeed.value)) : null;
    const pressure = current?.barometricPressure?.value ? Math.round(current.barometricPressure.value / 100) : null;

    this.shadowRoot.innerHTML = `
      <style>
        ha-card {
          padding: 16px;
          background: var(--card-background-color);
          border-radius: var(--border-radius);
          box-shadow: var(--card-box-shadow);
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .title {
          font-size: 20px;
          font-weight: 500;
        }
        .time {
          font-size: 14px;
          color: var(--secondary-text-color);
        }
        .current-weather {
          display: flex;
          align-items: center;
          margin-bottom: 16px;
        }
        .temperature {
          font-size: 48px;
          font-weight: 300;
          margin-right: 16px;
        }
        .condition-info {
          flex: 1;
        }
        .condition {
          font-size: 18px;
          margin-bottom: 8px;
          line-height: 1.3;
        }
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 16px;
        }
        .detail-item {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          padding: 4px 0;
        }
        .forecast {
          border-top: 1px solid var(--divider-color);
          padding-top: 16px;
        }
        .forecast-title {
          font-size: 16px;
          font-weight: 500;
          margin-bottom: 12px;
        }
        .forecast-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid var(--divider-color);
        }
        .forecast-item:last-child {
          border-bottom: none;
        }
        .forecast-day {
          font-weight: 500;
          min-width: 100px;
          font-size: 14px;
        }
        .forecast-condition {
          flex: 1;
          text-align: center;
          font-size: 13px;
          color: var(--secondary-text-color);
          padding: 0 8px;
        }
        .forecast-temp {
          text-align: right;
          min-width: 60px;
          font-size: 14px;
        }
        .weather-icon {
          width: 64px;
          height: 64px;
          margin-right: 16px;
        }
        .data-source {
          font-size: 12px;
          color: var(--secondary-text-color);
          text-align: center;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--divider-color);
        }
        .last-updated {
          font-size: 12px;
          color: var(--secondary-text-color);
          margin-top: 4px;
        }
      </style>
      
      <ha-card>
        <div class="header">
          <div class="title">Weather (NWS)</div>
          <div class="time">${currentTime}</div>
        </div>
        
        <div class="current-weather">
          <div class="weather-icon">
            <ha-icon icon="${this.getWeatherIcon(condition)}" style="width: 64px; height: 64px;"></ha-icon>
          </div>
          <div class="temperature">${temperature}°</div>
          <div class="condition-info">
            <div class="condition">${condition}</div>
          </div>
        </div>
        
        <div class="details-grid">
          ${humidity !== null ? `
            <div class="detail-item">
              <span>Humidity</span>
              <span>${humidity}%</span>
            </div>
          ` : ''}
          ${windSpeed !== null ? `
            <div class="detail-item">
              <span>Wind</span>
              <span>${windSpeed} ${this.getWindUnit()}</span>
            </div>
          ` : ''}
          ${pressure !== null ? `
            <div class="detail-item">
              <span>Pressure</span>
              <span>${pressure} mb</span>
            </div>
          ` : ''}
          <div class="detail-item">
            <span>Coordinates</span>
            <span>${this._weatherData.coordinates.latitude.toFixed(2)}, ${this._weatherData.coordinates.longitude.toFixed(2)}</span>
          </div>
        </div>
        
        ${forecast && forecast.length > 0 ? `
          <div class="forecast">
            <div class="forecast-title">7-Day Forecast</div>
            ${forecast.slice(0, 7).map(period => `
              <div class="forecast-item">
                <div class="forecast-day">${period.name}</div>
                <div class="forecast-condition">${period.shortForecast}</div>
                <div class="forecast-temp">${period.temperature}°${period.temperatureUnit}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        <div class="data-source">
          Data from National Weather Service
          ${this._weatherData.lastUpdated ? `
            <div class="last-updated">Updated: ${this._weatherData.lastUpdated.toLocaleTimeString()}</div>
          ` : ''}
        </div>
      </ha-card>
    `;
  }

  extractTempFromText(tempText) {
    const match = tempText.toString().match(/\d+/);
    return match ? match[0] : 'N/A';
  }

  celsiusToUnit(celsius) {
    const isMetric = this._hass?.config?.unit_system?.temperature === '°C';
    return isMetric ? celsius : (celsius * 9/5) + 32;
  }

  mpsToUnit(mps) {
    const isMetric = this._hass?.config?.unit_system?.length === 'km';
    return isMetric ? mps * 3.6 : mps * 2.237;
  }

  getWindUnit() {
    const isMetric = this._hass?.config?.unit_system?.length === 'km';
    return isMetric ? 'km/h' : 'mph';
  }

  getWeatherIcon(condition) {
    const conditionLower = condition.toLowerCase();
    
    if (conditionLower.includes('sunny') || conditionLower.includes('clear')) {
      return 'mdi:weather-sunny';
    } else if (conditionLower.includes('partly cloudy') || conditionLower.includes('mostly sunny')) {
      return 'mdi:weather-partly-cloudy';
    } else if (conditionLower.includes('mostly cloudy') || conditionLower.includes('overcast')) {
      return 'mdi:weather-cloudy';
    } else if (conditionLower.includes('rain') || conditionLower.includes('shower')) {
      if (conditionLower.includes('heavy') || conditionLower.includes('pour')) {
        return 'mdi:weather-pouring';
      }
      return 'mdi:weather-rainy';
    } else if (conditionLower.includes('snow') || conditionLower.includes('blizzard')) {
      return 'mdi:weather-snowy';
    } else if (conditionLower.includes('thunder') || conditionLower.includes('storm')) {
      return 'mdi:weather-lightning';
    } else if (conditionLower.includes('fog') || conditionLower.includes('mist')) {
      return 'mdi:weather-fog';
    } else if (conditionLower.includes('wind')) {
      return 'mdi:weather-windy';
    } else if (conditionLower.includes('hail')) {
      return 'mdi:weather-hail';
    }
    
    return 'mdi:weather-cloudy';
  }

  static getConfigElement() {
    return document.createElement('yawc-editor');
  }

  static getStubConfig() {
    return {
      update_interval: 600000,
      latitude: null,
      longitude: null
    };
  }
}

// Configuration editor
class YawcCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  setConfig(config) {
    this._config = config;
    this.render();
  }

  configChanged(newConfig) {
    const event = new Event('config-changed', {
      bubbles: true,
      composed: true,
    });
    event.detail = { config: newConfig };
    this.dispatchEvent(event);
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .form {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 12px;
        }
        paper-input {
          width: 100%;
        }
        .info {
          font-size: 14px;
          color: var(--secondary-text-color);
          margin-top: 4px;
        }
      </style>
      <div class="form">
        <paper-input
          label="Latitude (optional)"
          value="${this._config?.latitude || ''}"
          @value-changed="${this._valueChanged}"
          data-config-attribute="latitude"
          type="number"
          step="any"
        ></paper-input>
        <div class="info">Leave empty to use Home Assistant's configured latitude</div>
        
        <paper-input
          label="Longitude (optional)"
          value="${this._config?.longitude || ''}"
          @value-changed="${this._valueChanged}"
          data-config-attribute="longitude"
          type="number"
          step="any"
        ></paper-input>
        <div class="info">Leave empty to use Home Assistant's configured longitude</div>
        
        <paper-input
          label="Update Interval (minutes)"
          value="${(this._config?.update_interval || 600000) / 60000}"
          @value-changed="${this._intervalChanged}"
          type="number"
          min="1"
          max="60"
        ></paper-input>
        <div class="info">How often to refresh weather data (default: 10 minutes)</div>
      </div>
    `;
  }

  _valueChanged(ev) {
    if (!this._config || !this.shadowRoot) {
      return;
    }
    const target = ev.target;
    const configAttribute = target.dataset.configAttribute;
    if (configAttribute) {
      const value = target.value === '' ? null : parseFloat(target.value);
      const newConfig = {
        ...this._config,
        [configAttribute]: value,
      };
      this.configChanged(newConfig);
    }
  }

  _intervalChanged(ev) {
    if (!this._config || !this.shadowRoot) {
      return;
    }
    const minutes = parseInt(ev.target.value) || 10;
    const newConfig = {
      ...this._config,
      update_interval: minutes * 60000,
    };
    this.configChanged(newConfig);
  }
}

// Define the custom elements
customElements.define('yawc', YetAnotherWeatherCard);
customElements.define('yawc-editor', YawcCardEditor);

// Register with Home Assistant's card registry
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'yawc',
  name: 'YAWC',
  description: 'Yet Another Weather Card using National Weather Service API',
  preview: false,
  documentationURL: 'https://github.com/yourusername/yawc'
});
