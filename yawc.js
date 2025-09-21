console.log('YAWC v2.3.0 - Complete Working Version');

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
      title: config.title || 'YAWC Weather',
      update_interval: config.update_interval || 300000,
      show_alerts: config.show_alerts !== false,
      show_forecast: config.show_forecast !== false,
      show_hourly: config.show_hourly !== false,
      show_radar: config.show_radar !== false,
      show_branding: config.show_branding !== false,
      forecast_days: config.forecast_days || 5,
      radar_height: config.radar_height || 400,
      latitude: config.latitude || null,
      longitude: config.longitude || null
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
    const self = this;
    this._updateInterval = setInterval(() => {
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

    const latitude = this._config.latitude || this._hass.config.latitude;
    const longitude = this._config.longitude || this._hass.config.longitude;

    if (!latitude || !longitude) {
      this._weatherData = { error: 'No coordinates available' };
      this.render();
      return;
    }

    try {
      const pointUrl = `https://api.weather.gov/points/${latitude},${longitude}`;
      const pointResponse = await fetch(pointUrl);
      
      if (!pointResponse.ok) {
        throw new Error('Failed to get NWS point data');
      }
      
      const pointData = await pointResponse.json();
      const forecastUrl = pointData.properties.forecast;
      const forecastHourlyUrl = pointData.properties.forecastHourly;
      const observationStations = pointData.properties.observationStations;
      const radarStation = pointData.properties.radarStation;

      const [forecastData, hourlyData, alertsData, currentData] = await Promise.all([
        fetch(forecastUrl).then(r => r.json()),
        fetch(forecastHourlyUrl).then(r => r.json()).catch(() => null),
        fetch(`https://api.weather.gov/alerts/active?point=${latitude},${longitude}`).then(r => r.json()).catch(() => null),
        this.getCurrentObservations(observationStations)
      ]);

      this._weatherData = {
        current: currentData,
        forecast: forecastData.properties.periods,
        hourly: hourlyData ? hourlyData.properties.periods : [],
        alerts: alertsData ? alertsData.features : [],
        coordinates: { latitude, longitude },
        radarStation: radarStation,
        lastUpdated: new Date()
      };

      this.render();
    } catch (error) {
      console.error('Error fetching NWS weather data:', error);
      this._weatherData = { 
        error: error.message,
        lastUpdated: new Date()
      };
      this.render();
    }
  }

  async getCurrentObservations(observationStations) {
    try {
      const stationsResponse = await fetch(observationStations);
      const stationsData = await stationsResponse.json();
      
      if (!stationsData.features || stationsData.features.length === 0) {
        return null;
      }
      
      const station = stationsData.features[0];
      const obsResponse = await fetch(`${station.id}/observations/latest`);
      
      if (obsResponse.ok) {
        const obsData = await obsResponse.json();
        return obsData.properties;
      }
      return null;
    } catch {
      return null;
    }
  }

  render() {
    if (!this._hass) return;

    let html = `<style>${this.getStyles()}</style>`;
    
    if (!this._weatherData) {
      html += `<ha-card><div class="loading">Loading NWS weather data...</div></ha-card>`;
    } else if (this._weatherData.error) {
      html += `<ha-card><div class="error">Error: ${this._weatherData.error}</div></ha-card>`;
    } else {
      html += '<ha-card>';
      html += this.renderHeader();
      if (this._config.show_alerts) html += this.renderAlerts();
      html += this.renderCurrentWeather();
      if (this._config.show_radar) html += this.renderRadarSection();
      if (this._config.show_hourly) html += this.renderHourlyForecast();
      if (this._config.show_forecast) html += this.renderExtendedForecast();
      html += this.renderFooter();
      html += '</ha-card>';
    }

    this.shadowRoot.innerHTML = html;
  }

  renderHeader() {
    const lastUpdated = this._weatherData.lastUpdated ? 
      this._weatherData.lastUpdated.toLocaleTimeString() : 'Unknown';
    
    return `
      <div class="card-header">
        <div class="title">${this._config.title}</div>
        <div class="header-controls">
          <div class="last-updated">Updated: ${lastUpdated}</div>
          <button class="refresh-btn" onclick="this.getRootNode().host.fetchWeatherData()">↻</button>
        </div>
      </div>`;
  }

  renderAlerts() {
    if (!this._weatherData.alerts || this._weatherData.alerts.length === 0) {
      return '';
    }

    let html = '<div class="alerts-section">';
    
    for (const alert of this._weatherData.alerts) {
      const props = alert.properties;
      const severity = props.severity || 'Minor';
      
      html += `
        <div class="alert alert-${severity.toLowerCase()}">
          <div class="alert-header">
            <span class="alert-title">${props.event}</span>
            <span class="alert-severity">${severity}</span>
          </div>
          <div class="alert-content">
            <div class="alert-headline">${props.headline}</div>
          </div>
        </div>`;
    }
    
    html += '</div>';
    return html;
  }

  renderCurrentWeather() {
    const current = this._weatherData.current;
    const forecast = this._weatherData.forecast;
    
    let temperature = 'N/A';
    if (current?.temperature?.value) {
      temperature = Math.round(this.celsiusToFahrenheit(current.temperature.value));
    } else if (forecast?.[0]) {
      const match = forecast[0].temperature.toString().match(/\d+/);
      temperature = match ? match[0] : 'N/A';
    }

    let condition = 'Unknown';
    if (current?.textDescription) {
      condition = current.textDescription;
    } else if (forecast?.[0]?.shortForecast) {
      condition = forecast[0].shortForecast;
    }

    let html = `
      <div class="current-weather">
        <div class="current-main">
          <div class="temperature-section">
            <div class="temperature">${temperature}°</div>
          </div>
          <div class="condition-info">
            <div class="condition">${condition}</div>
          </div>
        </div>
        <div class="current-details">
          <div class="details-grid">`;

    if (current?.relativeHumidity?.value) {
      html += `
        <div class="detail-item">
          <span class="detail-label">Humidity</span>
          <span class="detail-value">${Math.round(current.relativeHumidity.value)}%</span>
        </div>`;
    }
    
    if (current?.windSpeed?.value) {
      const windSpeed = Math.round(this.mpsToMph(current.windSpeed.value));
      const windDir = current.windDirection ? this.getWindDirection(current.windDirection.value) : '';
      html += `
        <div class="detail-item">
          <span class="detail-label">Wind</span>
          <span class="detail-value">${windSpeed} mph ${windDir}</span>
        </div>`;
    }
    
    if (current?.barometricPressure?.value) {
      const pressure = Math.round(current.barometricPressure.value / 100);
      html += `
        <div class="detail-item">
          <span class="detail-label">Pressure</span>
          <span class="detail-value">${pressure} mb</span>
        </div>`;
    }
    
    if (current?.visibility?.value) {
      const visibility = Math.round(current.visibility.value / 1609.34);
      html += `
        <div class="detail-item">
          <span class="detail-label">Visibility</span>
          <span class="detail-value">${visibility} mi</span>
        </div>`;
    }
    
    html += '</div></div></div>';
    return html;
  }

  renderRadarSection() {
    const station = this._weatherData.radarStation || 'N/A';
    const lat = this._weatherData.coordinates.latitude;
    const lon = this._weatherData.coordinates.longitude;
    
    return `
      <div class="radar-section">
        <div class="section-header">Weather Radar</div>
        
        <div class="radar-option">
          <div class="radar-option-header">Windy.com Interactive Radar</div>
          <iframe 
            width="100%" 
            height="${this._config.radar_height}" 
            src="https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&width=650&height=${this._config.radar_height}&zoom=8&level=surface&overlay=radar&product=radar&menu=&message=&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=mph&metricTemp=%C2%B0F&radarRange=-1" 
            frameborder="0"
            style="border-radius: 8px;">
          </iframe>
        </div>
        
        <div class="radar-links">
          <div class="radar-links-header">Additional Radar Sources (Station: ${station}):</div>
          <div class="radar-links-grid">
            <a href="https://radar.weather.gov/station/${station}" target="_blank">NWS Radar</a>
            <a href="https://www.wunderground.com/radar/us/${station}" target="_blank">Weather Underground</a>
            <a href="https://weather.com/weather/radar/interactive/l/${lat},${lon}" target="_blank">Weather.com</a>
            <a href="https://www.accuweather.com/en/us/weather-radar?lat=${lat}&lon=${lon}" target="_blank">AccuWeather</a>
          </div>
        </div>
      </div>`;
  }

  renderHourlyForecast() {
    if (!this._weatherData.hourly || this._weatherData.hourly.length === 0) {
      return '';
    }

    let html = `
      <div class="hourly-section">
        <div class="section-header">Hourly Forecast</div>
        <div class="hourly-scroll">`;
    
    const hourlyData = this._weatherData.hourly.slice(0, 12);
    for (const hour of hourlyData) {
      const time = new Date(hour.startTime);
      const timeStr = time.toLocaleTimeString([], { hour: 'numeric' });
      const icon = this.getWeatherIcon(hour.shortForecast);
      
      html += `
        <div class="hourly-item">
          <div class="hour-time">${timeStr}</div>
          <div class="hour-icon">${icon}</div>
          <div class="hour-temp">${hour.temperature}°</div>`;
      
      if (hour.probabilityOfPrecipitation?.value) {
        html += `<div class="hour-precip">${hour.probabilityOfPrecipitation.value}%</div>`;
      }
      
      html += `<div class="hour-condition">${this.truncateText(hour.shortForecast, 15)}</div>
        </div>`;
    }
    
    html += '</div></div>';
    return html;
  }

  renderExtendedForecast() {
    if (!this._weatherData.forecast || this._weatherData.forecast.length === 0) {
      return '';
    }

    let html = `
      <div class="forecast-section">
        <div class="section-header">${this._config.forecast_days}-Day Forecast</div>`;
    
    const maxPeriods = Math.min(this._config.forecast_days * 2, this._weatherData.forecast.length);
    for (let i = 0; i < maxPeriods; i++) {
      const period = this._weatherData.forecast[i];
      const icon = this.getWeatherIcon(period.shortForecast);
      
      html += `
        <div class="forecast-item">
          <div class="forecast-name">${period.name}</div>
          <div class="forecast-icon">${icon}</div>
          <div class="forecast-temp">${period.temperature}°${period.temperatureUnit}</div>
          <div class="forecast-desc">${period.shortForecast}</div>
        </div>`;
    }
    
    html += '</div>';
    return html;
  }

  renderFooter() {
    return `
      <div class="card-footer">
        <div class="data-source">Data from National Weather Service</div>
        ${this._config.show_branding ? '<div class="branding">YAWC v2.3.0</div>' : ''}
      </div>`;
  }

  getWeatherIcon(condition) {
    if (!condition) return '🌡️';
    
    const lower = condition.toLowerCase();
    
    if (lower.includes('sunny') || lower.includes('clear')) return '☀️';
    if (lower.includes('partly cloudy') || lower.includes('partly sunny')) return '⛅';
    if (lower.includes('cloudy') || lower.includes('overcast')) return '☁️';
    if (lower.includes('rain') || lower.includes('shower')) return '🌧️';
    if (lower.includes('thunderstorm') || lower.includes('thunder')) return '⛈️';
    if (lower.includes('snow')) return '❄️';
    if (lower.includes('fog') || lower.includes('mist')) return '🌫️';
    if (lower.includes('wind')) return '💨';
    if (lower.includes('hot')) return '🌡️';
    if (lower.includes('cold')) return '🥶';
    
    return '🌡️';
  }

  getWindDirection(degrees) {
    if (!degrees && degrees !== 0) return '';
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                       'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  }

  celsiusToFahrenheit(celsius) {
    return (celsius * 9/5) + 32;
  }

  mpsToMph(mps) {
    return mps * 2.237;
  }

  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substr(0, maxLength).trim() + '...';
  }

  getStyles() {
    return `
      ha-card {
        padding: 0;
        background: var(--card-background-color);
        border-radius: var(--ha-card-border-radius);
        box-shadow: var(--ha-card-box-shadow);
        overflow: hidden;
      }
      
      .loading, .error {
        padding: 16px;
        text-align: center;
      }
      
      .error {
        color: var(--error-color);
      }
      
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 16px 0 16px;
        border-bottom: 1px solid var(--divider-color);
        margin-bottom: 16px;
      }
      
      .title {
        font-size: 20px;
        font-weight: 500;
      }
      
      .header-controls {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .last-updated {
        font-size: 12px;
        color: var(--secondary-text-color);
      }
      
      .refresh-btn {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        padding: 4px;
        color: var(--primary-text-color);
      }
      
      .alerts-section {
        margin: 0 16px 16px 16px;
      }
      
      .alert {
        margin-bottom: 8px;
        border-radius: 8px;
        overflow: hidden;
        border-left: 4px solid;
      }
      
      .alert-severe {
        background: #ff5722;
        border-left-color: #d32f2f;
      }
      
      .alert-moderate {
        background: #ff9800;
        border-left-color: #f57c00;
      }
      
      .alert-minor {
        background: #2196f3;
        border-left-color: #1976d2;
      }
      
      .alert-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: rgba(0,0,0,0.1);
      }
      
      .alert-title {
        font-weight: bold;
        color: white;
      }
      
      .alert-severity {
        font-size: 12px;
        padding: 2px 6px;
        border-radius: 4px;
        background: rgba(0,0,0,0.2);
        color: white;
      }
      
      .alert-content {
        padding: 12px;
        color: white;
      }
      
      .current-weather {
        margin: 0 16px 16px 16px;
      }
      
      .current-main {
        display: flex;
        align-items: center;
        margin-bottom: 16px;
        gap: 24px;
      }
      
      .temperature-section {
        display: flex;
        align-items: center;
      }
      
      .temperature {
        font-size: 48px;
        font-weight: 300;
        line-height: 1;
      }
      
      .condition-info {
        flex: 1;
      }
      
      .condition {
        font-size: 18px;
        margin-bottom: 8px;
      }
      
      .current-details {
        border-top: 1px solid var(--divider-color);
        padding-top: 16px;
      }
      
      .details-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 12px;
      }
      
      .detail-item {
        display: flex;
        justify-content: space-between;
        padding: 8px;
        background: var(--secondary-background-color);
        border-radius: 8px;
      }
      
      .detail-label {
        font-size: 14px;
        color: var(--secondary-text-color);
      }
      
      .detail-value {
        font-weight: 500;
        font-size: 14px;
      }
      
      .section-header {
        font-size: 16px;
        font-weight: 500;
        margin: 16px 16px 8px 16px;
        padding: 8px;
        background: var(--secondary-background-color);
        border-radius: 4px;
      }
      
      .radar-section {
        margin: 0 16px 16px 16px;
      }
      
      .radar-option {
        margin-bottom: 16px;
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        overflow: hidden;
      }
      
      .radar-option-header {
        padding: 8px 12px;
        background: var(--secondary-background-color);
        font-size: 14px;
        font-weight: 500;
      }
      
      .radar-links {
        margin-top: 16px;
        padding: 12px;
        background: var(--secondary-background-color);
        border-radius: 8px;
      }
      
      .radar-links-header {
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 8px;
      }
      
      .radar-links-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 8px;
      }
      
      .radar-links-grid a {
        padding: 6px 12px;
        background: var(--card-background-color);
        border: 1px solid var(--divider-color);
        border-radius: 4px;
        text-align: center;
        color: var(--primary-color);
        text-decoration: none;
        font-size: 13px;
        transition: background 0.2s;
      }
      
      .radar-links-grid a:hover {
        background: var(--primary-color);
        color: white;
      }
      
      .hourly-section {
        margin: 0 16px 16px 16px;
      }
      
      .hourly-scroll {
        display: flex;
        gap: 12px;
        overflow-x: auto;
        padding: 8px 0;
      }
      
      .hourly-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        min-width: 80px;
        padding: 12px 8px;
        background: var(--secondary-background-color);
        border-radius: 8px;
        text-align: center;
      }
      
      .hour-time {
        font-size: 12px;
        font-weight: 500;
        color: var(--secondary-text-color);
      }
      
      .hour-icon {
        font-size: 24px;
        line-height: 1;
      }
      
      .hour-temp {
        font-size: 16px;
        font-weight: bold;
      }
      
      .hour-precip {
        font-size: 11px;
        color: #2196f3;
        font-weight: 500;
      }
      
      .hour-condition {
        font-size: 10px;
        opacity: 0.8;
      }
      
      .forecast-section {
        margin: 0 16px 16px 16px;
      }
      
      .forecast-item {
        display: flex;
        align-items: center;
        padding: 12px;
        border-bottom: 1px solid var(--divider-color);
        gap: 12px;
      }
      
      .forecast-item:last-child {
        border-bottom: none;
      }
      
      .forecast-name {
        font-weight: 500;
        min-width: 100px;
      }
      
      .forecast-icon {
        font-size: 24px;
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
      
      .card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        border-top: 1px solid var(--divider-color);
        background: var(--secondary-background-color);
      }
      
      .data-source, .branding {
        font-size: 12px;
        color: var(--secondary-text-color);
      }
      
      @media (max-width: 600px) {
        .current-main {
          flex-direction: column;
          text-align: center;
        }
        
        .temperature-section {
          margin-bottom: 16px;
        }
        
        .radar-links-grid {
          grid-template-columns: 1fr 1fr;
        }
        
        .details-grid {
          grid-template-columns: 1fr 1fr;
        }
      }
    `;
  }

  getCardSize() {
    let size = 4;
    if (this._config.show_hourly) size += 1;
    if (this._config.show_radar) size += 3;
    if (this._config.show_forecast) size += 1;
    return size;
  }

  static getConfigElement() {
    return document.createElement('yawc-card-editor');
  }

  static getStubConfig() {
    return {
      title: 'YAWC Weather',
      show_radar: true,
      radar_height: 400,
      show_forecast: true,
      forecast_days: 5
    };
  }
}

// Register the card
customElements.define('yawc-card', YetAnotherWeatherCard);

// Register with HACS
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'yawc-card',
  name: 'YAWC - Yet Another Weather Card',
  description: 'NWS weather card with working radar, alerts, and forecasts',
  preview: false,
  documentationURL: 'https://github.com/cnewman402/yawc'
});

console.log('YAWC v2.3.0 - Card registered successfully!');
