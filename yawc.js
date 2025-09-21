console.info('YAWC v2.0.0 Loading...');

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
    this._config = Object.assign({
      title: 'YAWC Weather',
      update_interval: 300000,
      show_alerts: true,
      show_forecast: true,
      show_hourly: true,
      show_radar: true,
      show_branding: true,
      forecast_days: 5,
      radar_height: 500
    }, config);
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
    const self = this;
    this._updateInterval = setInterval(function() {
      self.fetchWeatherData();
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

      const pointResponse = await fetch('https://api.weather.gov/points/' + latitude + ',' + longitude);
      if (!pointResponse.ok) throw new Error('Failed to get NWS point data');
      
      const pointData = await pointResponse.json();
      const forecastUrl = pointData.properties.forecast;
      const forecastHourlyUrl = pointData.properties.forecastHourly;
      const observationStations = pointData.properties.observationStations;

      const forecastResponse = await fetch(forecastUrl);
      const forecastData = await forecastResponse.json();

      let hourlyData = null;
      try {
        const hourlyResponse = await fetch(forecastHourlyUrl);
        hourlyData = await hourlyResponse.json();
      } catch (e) {
        console.warn('Failed to get hourly data:', e);
      }

      let alertsData = null;
      try {
        const alertsResponse = await fetch('https://api.weather.gov/alerts/active?point=' + latitude + ',' + longitude);
        alertsData = await alertsResponse.json();
      } catch (e) {
        console.warn('Failed to get alerts:', e);
      }

      let currentData = null;
      try {
        const stationsResponse = await fetch(observationStations);
        const stationsData = await stationsResponse.json();
        if (stationsData.features && stationsData.features.length > 0) {
          const obsResponse = await fetch(stationsData.features[0].id + '/observations/latest');
          if (obsResponse.ok) {
            const obsData = await obsResponse.json();
            currentData = obsData.properties;
          }
        }
      } catch (e) {
        console.warn('Failed to get current observations:', e);
      }

      this._weatherData = {
        current: currentData,
        forecast: forecastData.properties.periods,
        hourly: hourlyData ? hourlyData.properties.periods : [],
        alerts: alertsData ? alertsData.features : [],
        coordinates: { latitude: latitude, longitude: longitude },
        lastUpdated: new Date()
      };

      this.render();

    } catch (error) {
      console.error('Error fetching weather data:', error);
      this._weatherData = { 
        error: error.message,
        lastUpdated: new Date()
      };
      this.render();
    }
  }

  render() {
    if (!this._hass) return;

    if (!this._weatherData) {
      this.shadowRoot.innerHTML = this.getLoadingHTML();
      return;
    }

    if (this._weatherData.error) {
      this.shadowRoot.innerHTML = this.getErrorHTML();
      return;
    }

    this.shadowRoot.innerHTML = this.getMainHTML();
  }

  getLoadingHTML() {
    return '<ha-card><div style="padding: 16px; text-align: center;">Loading weather data...</div></ha-card>';
  }

  getErrorHTML() {
    return '<ha-card><div style="padding: 16px; text-align: center; color: red;">Error: ' + this._weatherData.error + '</div></ha-card>';
  }

  getMainHTML() {
    const current = this._weatherData.current;
    const forecast = this._weatherData.forecast;
    
    let temperature = 'N/A';
    if (current && current.temperature && current.temperature.value) {
      temperature = Math.round(this.celsiusToFahrenheit(current.temperature.value));
    } else if (forecast && forecast[0]) {
      const match = forecast[0].temperature.toString().match(/\d+/);
      temperature = match ? match[0] : 'N/A';
    }

    const condition = (current && current.textDescription) || 
                     (forecast && forecast[0] && forecast[0].shortForecast) || 
                     'Unknown';

    let html = '<style>' + this.getStyles() + '</style>';
    html += '<ha-card>';
    html += '<div class="card-header">';
    html += '<div class="title">' + this._config.title + '</div>';
    html += '<button class="refresh-btn" onclick="this.getRootNode().host.fetchWeatherData()">↻</button>';
    html += '</div>';

    // Current weather
    html += '<div class="current-weather">';
    html += '<div class="temperature">' + temperature + '°</div>';
    html += '<div class="condition">' + condition + '</div>';
    html += '</div>';

    // Radar placeholder
    if (this._config.show_radar) {
      html += '<div class="radar-section">';
      html += '<div class="section-title">Animated Radar</div>';
      html += '<div class="radar-placeholder" style="height: ' + this._config.radar_height + 'px;">';
      html += '<div style="padding: 50px; text-align: center; color: #666;">🌩️ Radar system loading...</div>';
      html += '</div>';
      html += '</div>';
    }

    // Forecast
    if (this._config.show_forecast && forecast && forecast.length > 0) {
      html += '<div class="forecast-section">';
      html += '<div class="section-title">Forecast</div>';
      for (let i = 0; i < Math.min(this._config.forecast_days * 2, forecast.length); i++) {
        const period = forecast[i];
        html += '<div class="forecast-item">';
        html += '<div class="forecast-name">' + period.name + '</div>';
        html += '<div class="forecast-temp">' + period.temperature + '°' + period.temperatureUnit + '</div>';
        html += '<div class="forecast-desc">' + period.shortForecast + '</div>';
        html += '</div>';
      }
      html += '</div>';
    }

    // Footer
    html += '<div class="footer">Data from National Weather Service</div>';
    html += '</ha-card>';

    return html;
  }

  celsiusToFahrenheit(celsius) {
    return (celsius * 9/5) + 32;
  }

  getStyles() {
    return `
      ha-card {
        padding: 16px;
        background: var(--card-background-color);
        border-radius: var(--ha-card-border-radius);
        box-shadow: var(--ha-card-box-shadow);
      }
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        border-bottom: 1px solid var(--divider-color);
        padding-bottom: 8px;
      }
      .title {
        font-size: 20px;
        font-weight: 500;
      }
      .refresh-btn {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        padding: 4px;
      }
      .current-weather {
        text-align: center;
        margin: 20px 0;
      }
      .temperature {
        font-size: 48px;
        font-weight: 300;
        margin-bottom: 8px;
      }
      .condition {
        font-size: 18px;
        color: var(--secondary-text-color);
      }
      .section-title {
        font-size: 16px;
        font-weight: 500;
        margin: 16px 0 8px 0;
        padding: 8px;
        background: var(--secondary-background-color);
        border-radius: 4px;
      }
      .radar-section {
        margin: 16px 0;
      }
      .radar-placeholder {
        background: #f0f0f0;
        border-radius: 8px;
        border: 1px solid var(--divider-color);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .forecast-section {
        margin: 16px 0;
      }
      .forecast-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px;
        border-bottom: 1px solid var(--divider-color);
      }
      .forecast-name {
        font-weight: 500;
        min-width: 80px;
      }
      .forecast-temp {
        font-weight: bold;
        min-width: 60px;
        text-align: center;
      }
      .forecast-desc {
        flex: 1;
        text-align: right;
        color: var(--secondary-text-color);
        font-size: 14px;
      }
      .footer {
        text-align: center;
        font-size: 12px;
        color: var(--secondary-text-color);
        margin-top: 16px;
        padding-top: 8px;
        border-top: 1px solid var(--divider-color);
      }
    `;
  }

  getCardSize() {
    return this._config.show_radar ? 6 : 4;
  }

  static getConfigElement() {
    return document.createElement('yawc-card-editor');
  }

  static getStubConfig() {
    return {
      title: 'YAWC Weather',
      update_interval: 300000,
      show_radar: true,
      radar_height: 500,
      show_forecast: true,
      forecast_days: 5
    };
  }
}

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
      <div style="padding: 16px;">
        <div style="margin-bottom: 16px;">
          <label>Card Title:</label><br>
          <input type="text" id="title" value="${this._config && this._config.title || 'YAWC Weather'}" 
                 style="width: 100%; padding: 8px; margin-top: 4px;">
        </div>
        
        <div style="margin-bottom: 16px;">
          <label>
            <input type="checkbox" id="show_radar" ${this._config && this._config.show_radar !== false ? 'checked' : ''}>
            Enable Radar
          </label>
        </div>
        
        <div style="margin-bottom: 16px;">
          <label>Radar Height:</label><br>
          <input type="number" id="radar_height" value="${this._config && this._config.radar_height || 500}" 
                 min="200" max="800" style="width: 100px; padding: 4px;">
          <span style="font-size: 12px; color: #666;">px</span>
        </div>
        
        <div style="margin-bottom: 16px;">
          <label>
            <input type="checkbox" id="show_forecast" ${this._config && this._config.show_forecast !== false ? 'checked' : ''}>
            Show Forecast
          </label>
        </div>
        
        <div style="margin-bottom: 16px;">
          <label>Forecast Days:</label><br>
          <input type="number" id="forecast_days" value="${this._config && this._config.forecast_days || 5}" 
                 min="1" max="7" style="width: 60px; padding: 4px;">
        </div>
        
        <div style="background: #e8f5e8; padding: 12px; border-radius: 4px; margin-top: 16px;">
          ✅ YAWC Basic Configuration Ready
        </div>
      </div>
    `;
    
    this.attachEventListeners();
  }

  attachEventListeners() {
    const self = this;
    
    const titleInput = this.shadowRoot.getElementById('title');
    if (titleInput) {
      titleInput.addEventListener('input', function(e) {
        self.updateConfig('title', e.target.value);
      });
    }

    const radarCheckbox = this.shadowRoot.getElementById('show_radar');
    if (radarCheckbox) {
      radarCheckbox.addEventListener('change', function(e) {
        self.updateConfig('show_radar', e.target.checked);
      });
    }

    const radarHeightInput = this.shadowRoot.getElementById('radar_height');
    if (radarHeightInput) {
      radarHeightInput.addEventListener('input', function(e) {
        self.updateConfig('radar_height', parseInt(e.target.value) || 500);
      });
    }

    const forecastCheckbox = this.shadowRoot.getElementById('show_forecast');
    if (forecastCheckbox) {
      forecastCheckbox.addEventListener('change', function(e) {
        self.updateConfig('show_forecast', e.target.checked);
      });
    }

    const forecastDaysInput = this.shadowRoot.getElementById('forecast_days');
    if (forecastDaysInput) {
      forecastDaysInput.addEventListener('input', function(e) {
        self.updateConfig('forecast_days', parseInt(e.target.value) || 5);
      });
    }
  }

  updateConfig(key, value) {
    const newConfig = Object.assign({}, this._config);
    newConfig[key] = value;
    this._config = newConfig;
    this.configChanged(newConfig);
  }
}

customElements.define('yawc-card', YetAnotherWeatherCard);
customElements.define('yawc-card-editor', YawcCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'yawc-card',
  name: 'YAWC Weather Card',
  description: 'Weather card with radar support',
  preview: false
});

console.info('YAWC v2.0.0 Loaded Successfully!');
