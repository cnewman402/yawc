console.info(
  '%c YAWC %c Yet Another Weather Card (NWS) v1.1.0 ',
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
    this._isLoading = false;
  }

  setConfig(config) {
    if (!config) {
      throw new Error('Invalid configuration');
    }
    this._config = {
      title: 'YAWC Weather',
      update_interval: 300000, // 5 minutes default
      show_alerts: true,
      show_forecast: true,
      show_hourly: true,
      show_branding: true,
      forecast_days: 5,
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
    if (!this._hass || this._isLoading) return;

    this._isLoading = true;
    this.render(); // Show loading state

    try {
      const latitude = this._config.latitude || this._hass.config.latitude;
      const longitude = this._config.longitude || this._hass.config.longitude;

      if (!latitude || !longitude) {
        throw new Error('No coordinates available');
      }

      // Get NWS point data
      const pointResponse = await fetch(`https://api.weather.gov/points/${latitude},${longitude}`);
      if (!pointResponse.ok) throw new Error('Failed to get NWS point data');
      
      const pointData = await pointResponse.json();
      const { gridX, gridY, office } = pointData.properties;
      const forecastUrl = pointData.properties.forecast;
      const forecastHourlyUrl = pointData.properties.forecastHourly;
      const observationStations = pointData.properties.observationStations;

      // Fetch all data in parallel
      const [currentData, forecastData, hourlyData, alertsData] = await Promise.allSettled([
        this.getCurrentObservations(observationStations),
        fetch(forecastUrl).then(r => r.json()),
        fetch(forecastHourlyUrl).then(r => r.json()),
        fetch(`https://api.weather.gov/alerts/active?point=${latitude},${longitude}`).then(r => r.json())
      ]);

      this._weatherData = {
        current: currentData.status === 'fulfilled' ? currentData.value : null,
        forecast: forecastData.status === 'fulfilled' ? forecastData.value.properties.periods : [],
        hourly: hourlyData.status === 'fulfilled' ? hourlyData.value.properties.periods : [],
        alerts: alertsData.status === 'fulfilled' ? alertsData.value.features : [],
        coordinates: { latitude, longitude },
        office: office,
        lastUpdated: new Date(),
        error: null
      };

      this.render();

    } catch (error) {
      console.error('Error fetching NWS weather data:', error);
      this._weatherData = { 
        error: error.message,
        lastUpdated: new Date()
      };
      this.render();
    } finally {
      this._isLoading = false;
    }
  }

  async getCurrentObservations(observationStations) {
    try {
      const stationsResponse = await fetch(observationStations);
      const stationsData = await stationsResponse.json();
      
      // Try multiple stations if the first one fails
      for (const station of stationsData.features.slice(0, 3)) {
        try {
          const obsResponse = await fetch(`${station.id}/observations/latest`);
          if (obsResponse.ok) {
            const obsData = await obsResponse.json();
            return obsData.properties;
          }
        } catch (e) {
          console.warn(`Failed to get observations from ${station.id}:`, e);
        }
      }
      return null;
    } catch (e) {
      console.warn('Failed to get current observations:', e);
      return null;
    }
  }

  getCardSize() {
    return this._config.show_hourly ? 6 : 4;
  }

  render() {
    if (!this._hass) return;

    const currentTime = new Date().toLocaleString();

    // Loading state
    if (this._isLoading && !this._weatherData) {
      this.shadowRoot.innerHTML = `
        ${this.getStyles()}
        <ha-card>
          <div class="card-header">
            <div class="title">${this._config.title}</div>
            <div class="loading-spinner">⟳</div>
          </div>
          <div class="loading-content">
            <div>Loading weather data...</div>
            <div class="time">${currentTime}</div>
          </div>
        </ha-card>
      `;
      return;
    }

    // Error state
    if (this._weatherData?.error) {
      this.shadowRoot.innerHTML = `
        ${this.getStyles()}
        <ha-card>
          <div class="card-header">
            <div class="title">${this._config.title}</div>
            <button class="refresh-btn" onclick="this.getRootNode().host.fetchWeatherData()">
              <ha-icon icon="mdi:refresh"></ha-icon>
            </button>
          </div>
          <div class="error-content">
            <ha-icon icon="mdi:alert-circle" class="error-icon"></ha-icon>
            <div>Error loading weather data:</div>
            <div class="error-message">${this._weatherData.error}</div>
            <div class="time">${currentTime}</div>
          </div>
        </ha-card>
      `;
      return;
    }

    // No data state
    if (!this._weatherData) {
      this.shadowRoot.innerHTML = `
        ${this.getStyles()}
        <ha-card>
          <div class="card-header">
            <div class="title">${this._config.title}</div>
          </div>
          <div class="loading-content">
            <div>No weather data available</div>
            <div class="time">${currentTime}</div>
          </div>
        </ha-card>
      `;
      return;
    }

    // Main render
    this.shadowRoot.innerHTML = `
      ${this.getStyles()}
      <ha-card>
        ${this.renderHeader()}
        ${this.renderAlerts()}
        ${this.renderCurrentWeather()}
        ${this.renderHourlyForecast()}
        ${this.renderExtendedForecast()}
        ${this.renderFooter()}
      </ha-card>
    `;

    // Add event listeners
    this.addEventListeners();
  }

  renderHeader() {
    const lastUpdated = this._weatherData.lastUpdated?.toLocaleTimeString() || 'Unknown';
    
    return `
      <div class="card-header">
        <div class="title">${this._config.title}</div>
        <div class="header-controls">
          <div class="last-updated">Updated: ${lastUpdated}</div>
          <button class="refresh-btn" onclick="this.getRootNode().host.fetchWeatherData()">
            <ha-icon icon="mdi:refresh"></ha-icon>
          </button>
        </div>
      </div>
    `;
  }

  renderAlerts() {
    if (!this._config.show_alerts || !this._weatherData.alerts?.length) return '';

    const alerts = this._weatherData.alerts;
    const severeAlerts = alerts.filter(alert => 
      ['Extreme', 'Severe'].includes(alert.properties.severity)
    );
    
    return `
      <div class="alerts-section">
        ${severeAlerts.map(alert => this.renderAlert(alert)).join('')}
        ${alerts.length > severeAlerts.length ? `
          <div class="minor-alerts">
            <div class="minor-alerts-header" onclick="this.getRootNode().host.toggleMinorAlerts()">
              <ha-icon icon="mdi:information"></ha-icon>
              <span>${alerts.length - severeAlerts.length} additional weather alert(s)</span>
              <ha-icon icon="mdi:chevron-down" class="expand-icon"></ha-icon>
            </div>
            <div class="minor-alerts-content" style="display: none;">
              ${alerts.filter(alert => 
                !['Extreme', 'Severe'].includes(alert.properties.severity)
              ).map(alert => this.renderAlert(alert)).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  renderAlert(alert) {
    const props = alert.properties;
    const severity = props.severity || 'Minor';
    const urgency = props.urgency || 'Future';
    
    return `
      <div class="alert alert-${severity.toLowerCase()} alert-${urgency.toLowerCase()}">
        <div class="alert-header">
          <ha-icon icon="${this.getAlertIcon(props.event)}"></ha-icon>
          <span class="alert-title">${props.event}</span>
          <span class="alert-severity">${severity}</span>
        </div>
        <div class="alert-content">
          <div class="alert-headline">${props.headline}</div>
          <div class="alert-description">${this.truncateText(props.description, 200)}</div>
          <div class="alert-times">
            ${props.onset ? `<div>Effective: ${new Date(props.onset).toLocaleString()}</div>` : ''}
            ${props.expires ? `<div>Expires: ${new Date(props.expires).toLocaleString()}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  renderCurrentWeather() {
    const { current, forecast } = this._weatherData;
    
    // Get temperature from current observations or forecast
    const temperature = current?.temperature?.value ? 
      Math.round(this.celsiusToUnit(current.temperature.value)) : 
      (forecast[0] ? this.extractTempFromText(forecast[0].temperature) : 'N/A');
    
    const feelsLike = current?.heatIndex?.value || current?.windChill?.value;
    const feelsLikeTemp = feelsLike ? Math.round(this.celsiusToUnit(feelsLike)) : null;
    
    const condition = current?.textDescription || forecast[0]?.shortForecast || 'Unknown';
    const humidity = current?.relativeHumidity?.value ? Math.round(current.relativeHumidity.value) : null;
    const windSpeed = current?.windSpeed?.value ? Math.round(this.mpsToUnit(current.windSpeed.value)) : null;
    const windDirection = current?.windDirection?.value ? this.degreesToCardinal(current.windDirection.value) : null;
    const pressure = current?.barometricPressure?.value ? Math.round(current.barometricPressure.value / 100) : null;
    const visibility = current?.visibility?.value ? Math.round(this.metersToUnit(current.visibility.value)) : null;
    const dewPoint = current?.dewpoint?.value ? Math.round(this.celsiusToUnit(current.dewpoint.value)) : null;

    return `
      <div class="current-weather">
        <div class="current-main">
          <div class="weather-icon">
            <ha-icon icon="${this.getWeatherIcon(condition)}" style="width: 64px; height: 64px;"></ha-icon>
          </div>
          <div class="temperature-section">
            <div class="temperature">${temperature}°</div>
            ${feelsLikeTemp && Math.abs(feelsLikeTemp - temperature) > 2 ? `
              <div class="feels-like">Feels like ${feelsLikeTemp}°</div>
            ` : ''}
          </div>
          <div class="condition-info">
            <div class="condition">${condition}</div>
            ${forecast[0]?.detailedForecast ? `
              <div class="detailed-forecast">${this.truncateText(forecast[0].detailedForecast, 100)}</div>
            ` : ''}
          </div>
        </div>
        
        <div class="current-details">
          <div class="details-grid">
            ${humidity !== null ? `
              <div class="detail-item">
                <ha-icon icon="mdi:water-percent"></ha-icon>
                <span class="detail-label">Humidity</span>
                <span class="detail-value">${humidity}%</span>
              </div>
            ` : ''}
            ${windSpeed !== null ? `
              <div class="detail-item">
                <ha-icon icon="mdi:weather-windy"></ha-icon>
                <span class="detail-label">Wind</span>
                <span class="detail-value">${windSpeed} ${this.getWindUnit()}${windDirection ? ` ${windDirection}` : ''}</span>
              </div>
            ` : ''}
            ${pressure !== null ? `
              <div class="detail-item">
                <ha-icon icon="mdi:gauge"></ha-icon>
                <span class="detail-label">Pressure</span>
                <span class="detail-value">${pressure} mb</span>
              </div>
            ` : ''}
            ${visibility !== null ? `
              <div class="detail-item">
                <ha-icon icon="mdi:eye"></ha-icon>
                <span class="detail-label">Visibility</span>
                <span class="detail-value">${visibility} ${this.getDistanceUnit()}</span>
              </div>
            ` : ''}
            ${dewPoint !== null ? `
              <div class="detail-item">
                <ha-icon icon="mdi:thermometer"></ha-icon>
                <span class="detail-label">Dew Point</span>
                <span class="detail-value">${dewPoint}°</span>
              </div>
            ` : ''}
            <div class="detail-item">
              <ha-icon icon="mdi:map-marker"></ha-icon>
              <span class="detail-label">Location</span>
              <span class="detail-value">${this._weatherData.coordinates.latitude.toFixed(2)}, ${this._weatherData.coordinates.longitude.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderHourlyForecast() {
    if (!this._config.show_hourly || !this._weatherData.hourly?.length) return '';

    const hourlyData = this._weatherData.hourly.slice(0, 12);
    
    return `
      <div class="hourly-section">
        <div class="section-header" onclick="this.getRootNode().host.toggleSection('hourly')">
          <ha-icon icon="mdi:clock-outline"></ha-icon>
          <span>Hourly Forecast</span>
          <ha-icon icon="mdi:chevron-down" class="expand-icon"></ha-icon>
        </div>
        <div class="hourly-content">
          <div class="hourly-scroll">
            ${hourlyData.map(hour => this.renderHourlyItem(hour)).join('')}
          </div>
        </div>
      </div>
    `;
  }

  renderHourlyItem(hour) {
    const time = new Date(hour.startTime);
    const isNow = time <= new Date() && new Date() < new Date(hour.endTime);
    const timeStr = isNow ? 'Now' : time.toLocaleTimeString([], { hour: 'numeric' });
    
    return `
      <div class="hourly-item ${isNow ? 'current-hour' : ''}">
        <div class="hour-time">${timeStr}</div>
        <div class="hour-icon">
          <ha-icon icon="${this.getWeatherIcon(hour.shortForecast)}"></ha-icon>
        </div>
        <div class="hour-temp">${hour.temperature}°</div>
        <div class="hour-precip">${hour.probabilityOfPrecipitation?.value || 0}%</div>
        <div class="hour-condition">${this.truncateText(hour.shortForecast, 15)}</div>
      </div>
    `;
  }

  renderExtendedForecast() {
    if (!this._config.show_forecast || !this._weatherData.forecast?.length) return '';

    const forecastDays = Math.min(this._config.forecast_days, Math.floor(this._weatherData.forecast.length / 2));
    const forecast = this._weatherData.forecast.slice(0, forecastDays * 2);
    
    return `
      <div class="forecast-section">
        <div class="section-header" onclick="this.getRootNode().host.toggleSection('forecast')">
          <ha-icon icon="mdi:calendar"></ha-icon>
          <span>${forecastDays}-Day Forecast</span>
          <ha-icon icon="mdi:chevron-down" class="expand-icon"></ha-icon>
        </div>
        <div class="forecast-content">
          ${this.groupForecastByDay(forecast).map(day => this.renderForecastDay(day)).join('')}
        </div>
      </div>
    `;
  }

  groupForecastByDay(forecast) {
    const days = [];
    for (let i = 0; i < forecast.length; i += 2) {
      const day = forecast[i];
      const night = forecast[i + 1];
      days.push({ day, night });
    }
    return days;
  }

  renderForecastDay(dayData) {
    const { day, night } = dayData;
    
    return `
      <div class="forecast-day">
        <div class="forecast-day-header">
          <div class="day-name">${day.name}</div>
          <div class="day-temps">
            <span class="high-temp">${day.temperature}°</span>
            ${night ? `<span class="low-temp">${night.temperature}°</span>` : ''}
          </div>
        </div>
        <div class="forecast-day-content">
          <div class="day-forecast">
            <div class="forecast-period">
              <ha-icon icon="${this.getWeatherIcon(day.shortForecast)}"></ha-icon>
              <div class="forecast-text">
                <div class="short-forecast">${day.shortForecast}</div>
                <div class="detailed-forecast">${this.truncateText(day.detailedForecast, 120)}</div>
              </div>
            </div>
          </div>
          ${night ? `
            <div class="night-forecast">
              <div class="forecast-period">
                <ha-icon icon="${this.getWeatherIcon(night.shortForecast)}"></ha-icon>
                <div class="forecast-text">
                  <div class="short-forecast">${night.shortForecast}</div>
                  <div class="detailed-forecast">${this.truncateText(night.detailedForecast, 120)}</div>
                </div>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderFooter() {
    return `
      <div class="card-footer">
        <div class="data-source">
          <ha-icon icon="mdi:weather-cloudy"></ha-icon>
          <span>Data from National Weather Service${this._weatherData.office ? ` (${this._weatherData.office})` : ''}</span>
        </div>
        ${this._config.show_branding ? `
          <div class="branding">
            <span>YAWC v1.1.0</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  // Event handlers
  addEventListeners() {
    // Refresh button is handled inline
    // Section toggles are handled inline
    // Minor alerts toggle is handled inline
  }

  toggleSection(section) {
    const content = this.shadowRoot.querySelector(`.${section}-content`);
    const icon = this.shadowRoot.querySelector(`.${section}-section .expand-icon`);
    
    if (content && icon) {
      const isHidden = content.style.display === 'none';
      content.style.display = isHidden ? 'block' : 'none';
      icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
    }
  }

  toggleMinorAlerts() {
    const content = this.shadowRoot.querySelector('.minor-alerts-content');
    const icon = this.shadowRoot.querySelector('.minor-alerts .expand-icon');
    
    if (content && icon) {
      const isHidden = content.style.display === 'none';
      content.style.display = isHidden ? 'block' : 'none';
      icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
    }
  }

  // Utility functions
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

  metersToUnit(meters) {
    const isMetric = this._hass?.config?.unit_system?.length === 'km';
    return isMetric ? meters / 1000 : meters * 0.000621371;
  }

  getWindUnit() {
    const isMetric = this._hass?.config?.unit_system?.length === 'km';
    return isMetric ? 'km/h' : 'mph';
  }

  getDistanceUnit() {
    const isMetric = this._hass?.config?.unit_system?.length === 'km';
    return isMetric ? 'km' : 'mi';
  }

  degreesToCardinal(degrees) {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return dirs[Math.round(degrees / 22.5) % 16];
  }

  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substr(0, maxLength).trim() + '...';
  }

  getAlertIcon(eventType) {
    const type = eventType.toLowerCase();
    if (type.includes('tornado')) return 'mdi:weather-tornado';
    if (type.includes('hurricane')) return 'mdi:weather-hurricane';
    if (type.includes('thunderstorm') || type.includes('severe')) return 'mdi:weather-lightning';
    if (type.includes('flood')) return 'mdi:weather-flood';
    if (type.includes('fire') || type.includes('red flag')) return 'mdi:fire';
    if (type.includes('winter') || type.includes('snow') || type.includes('blizzard')) return 'mdi:weather-snowy-heavy';
    if (type.includes('heat')) return 'mdi:thermometer';
    if (type.includes('wind')) return 'mdi:weather-windy';
    return 'mdi:alert';
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

  getStyles() {
    return `
      <style>
        ha-card {
          background: var(--card-background-color);
          border-radius: var(--ha-card-border-radius);
          box-shadow: var(--ha-card-box-shadow);
          padding: 0;
          overflow: hidden;
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
          color: var(--primary-text-color);
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
          color: var(--primary-text-color);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }
        
        .refresh-btn:hover {
          background-color: var(--secondary-background-color);
        }
        
        .loading-content, .error-content {
          padding: 16px;
          text-align: center;
        }
        
        .loading-spinner {
          animation: spin 1s linear infinite;
          font-size: 18px;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .error-content {
          color: var(--error-color);
        }
        
        .error-icon {
          font-size: 48px;
          margin-bottom: 8px;
        }
        
        .error-message {
          font-size: 14px;
          margin: 8px 0;
          opacity: 0.8;
        }
        
        .time {
          font-size: 12px;
          color: var(--secondary-text-color);
          margin-top: 8px;
        }
        
        /* Alerts Section */
        .alerts-section {
          margin: 0 16px 16px 16px;
        }
        
        .alert {
          margin-bottom: 8px;
          border-radius: 8px;
          overflow: hidden;
          border-left: 4px solid;
        }
        
        .alert-extreme {
          background: var(--error-color);
          border-left-color: darkred;
          animation: pulse-severe 2s infinite;
        }
        
        .alert-severe {
          background: var(--warning-color);
          border-left-color: darkorange;
          animation: pulse-warning 3s infinite;
        }
        
        .alert-moderate {
          background: var(--info-color);
          border-left-color: blue;
        }
        
        .alert-minor {
          background: var(--secondary-background-color);
          border-left-color: gray;
        }
        
        @keyframes pulse-severe {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        @keyframes pulse-warning {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        
        .alert-header {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.1);
          gap: 8px;
        }
        
        .alert-title {
          flex: 1;
          font-weight: bold;
          color: white;
        }
        
        .alert-severity {
          font-size: 12px;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.2);
          color: white;
        }
        
        .alert-content {
          padding: 12px;
          color: white;
        }
        
        .alert-headline {
          font-weight: bold;
          margin-bottom: 8px;
        }
        
        .alert-description {
          margin-bottom: 8px;
          line-height: 1.4;
        }
        
        .alert-times {
          font-size: 12px;
          opacity: 0.9;
        }
        
        .minor-alerts {
          margin-top: 8px;
        }
        
        .minor-alerts-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          background: var(--secondary-background-color);
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .minor-alerts-header:hover {
          background: var(--primary-background-color);
        }
        
        .expand-icon {
          transition: transform 0.3s ease;
        }
        
        /* Current Weather Section */
        .current-weather {
          margin: 0 16px 16px 16px;
        }
        
        .current-main {
          display: flex;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .weather-icon {
          margin-right: 16px;
        }
        
        .temperature-section {
          margin-right: 16px;
        }
        
        .temperature {
          font-size: 48px;
          font-weight: 300;
          line-height: 1;
        }
        
        .feels-like {
          font-size: 14px;
          color: var(--secondary-text-color);
          margin-top: 4px;
        }
        
        .condition-info {
          flex: 1;
        }
        
        .condition {
          font-size: 18px;
          margin-bottom: 8px;
          line-height: 1.3;
        }
        
        .detailed-forecast {
          font-size: 14px;
          color: var(--secondary-text-color);
          line-height: 1.4;
        }
        
        .current-details {
          border-top: 1px solid var(--divider-color);
          padding-top: 16px;
        }
        
        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }
        
        .detail-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          background: var(--secondary-background-color);
          border-radius: 8px;
        }
        
        .detail-label {
          flex: 1;
          font-size: 14px;
        }
        
        .detail-value {
          font-weight: 500;
          font-size: 14px;
        }
        
        /* Section Headers */
        .section-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: var(--secondary-background-color);
          cursor: pointer;
          transition: background-color 0.2s;
          margin: 0 0 16px 0;
        }
        
        .section-header:hover {
          background: var(--primary-background-color);
        }
        
        .section-header span {
          flex: 1;
          font-size: 16px;
          font-weight: 500;
        }
        
        /* Hourly Forecast */
        .hourly-section {
          margin-bottom: 16px;
        }
        
        .hourly-content {
          margin: 0 16px;
        }
        
        .hourly-scroll {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding: 8px 0;
          scrollbar-width: thin;
        }
        
        .hourly-scroll::-webkit-scrollbar {
          height: 4px;
        }
        
        .hourly-scroll::-webkit-scrollbar-track {
          background: var(--secondary-background-color);
          border-radius: 2px;
        }
        
        .hourly-scroll::-webkit-scrollbar-thumb {
          background: var(--primary-color);
          border-radius: 2px;
        }
        
        .hourly-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          min-width: 80px;
          padding: 12px 8px;
          background: var(--secondary-background-color);
          border-radius: 8px;
          text-align: center;
        }
        
        .hourly-item.current-hour {
          background: var(--primary-color);
          color: white;
        }
        
        .hour-time {
          font-size: 12px;
          font-weight: 500;
        }
        
        .hour-icon {
          font-size: 24px;
        }
        
        .hour-temp {
          font-size: 16px;
          font-weight: bold;
        }
        
        .hour-precip {
          font-size: 12px;
          color: var(--info-color);
          font-weight: 500;
        }
        
        .current-hour .hour-precip {
          color: rgba(255, 255, 255, 0.8);
        }
        
        .hour-condition {
          font-size: 10px;
          line-height: 1.2;
          opacity: 0.8;
        }
        
        /* Extended Forecast */
        .forecast-section {
          margin-bottom: 16px;
        }
        
        .forecast-content {
          margin: 0 16px;
        }
        
        .forecast-day {
          margin-bottom: 16px;
          border: 1px solid var(--divider-color);
          border-radius: 8px;
          overflow: hidden;
        }
        
        .forecast-day-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: var(--secondary-background-color);
        }
        
        .day-name {
          font-size: 16px;
          font-weight: 500;
        }
        
        .day-temps {
          display: flex;
          gap: 8px;
        }
        
        .high-temp {
          font-size: 18px;
          font-weight: bold;
        }
        
        .low-temp {
          font-size: 18px;
          color: var(--secondary-text-color);
        }
        
        .forecast-day-content {
          padding: 16px;
        }
        
        .day-forecast, .night-forecast {
          margin-bottom: 12px;
        }
        
        .night-forecast {
          border-top: 1px solid var(--divider-color);
          padding-top: 12px;
        }
        
        .forecast-period {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        
        .forecast-text {
          flex: 1;
        }
        
        .short-forecast {
          font-weight: 500;
          margin-bottom: 4px;
        }
        
        .detailed-forecast {
          font-size: 14px;
          color: var(--secondary-text-color);
          line-height: 1.4;
        }
        
        /* Footer */
        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-top: 1px solid var(--divider-color);
          background: var(--secondary-background-color);
        }
        
        .data-source {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--secondary-text-color);
        }
        
        .branding {
          font-size: 12px;
          color: var(--secondary-text-color);
          font-weight: 500;
        }
        
        /* Responsive Design */
        @media (max-width: 600px) {
          .current-main {
            flex-direction: column;
            text-align: center;
          }
          
          .weather-icon, .temperature-section {
            margin-right: 0;
            margin-bottom: 16px;
          }
          
          .details-grid {
            grid-template-columns: 1fr;
          }
          
          .card-footer {
            flex-direction: column;
            gap: 8px;
            text-align: center;
          }
          
          .hourly-scroll {
            margin: 0 -16px;
            padding: 8px 16px;
          }
        }
        
        @media (max-width: 400px) {
          .temperature {
            font-size: 36px;
          }
          
          .hourly-item {
            min-width: 70px;
            padding: 8px 4px;
          }
          
          .hour-condition {
            display: none;
          }
        }
      </style>
    `;
  }

  static getConfigElement() {
    return document.createElement('yawc-card-editor');
  }

  static getStubConfig() {
    return {
      title: 'YAWC Weather',
      update_interval: 300000,
      show_alerts: true,
      show_forecast: true,
      show_hourly: true,
      show_branding: true,
      forecast_days: 5,
      latitude: null,
      longitude: null
    };
  }
}

// Working Configuration Editor
class YawcCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  setConfig(config) {
    this._config = { ...config };
    if (this.shadowRoot.innerHTML) {
      this.updateValues();
    } else {
      this.render();
    }
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
        :host {
          display: block;
        }
        .card-config {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 20px;
          background: var(--card-background-color);
          border-radius: 8px;
          box-shadow: var(--ha-card-box-shadow);
        }
        
        .config-section {
          border: 1px solid var(--divider-color);
          border-radius: 8px;
          padding: 16px;
          background: var(--secondary-background-color);
        }
        
        .section-title {
          font-size: 18px;
          font-weight: 500;
          margin-bottom: 16px;
          color: var(--primary-text-color);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .form-group {
          margin-bottom: 16px;
        }
        
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }
        
        .form-row.full-width {
          grid-template-columns: 1fr;
        }
        
        .input-group {
          display: flex;
          flex-direction: column;
        }
        
        .label {
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 4px;
          color: var(--primary-text-color);
        }
        
        .input {
          padding: 8px 12px;
          border: 2px solid var(--divider-color);
          border-radius: 4px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
          font-size: 14px;
          transition: border-color 0.2s;
        }
        
        .input:focus {
          outline: none;
          border-color: var(--primary-color);
        }
        
        .input:invalid {
          border-color: var(--error-color);
        }
        
        .switch-group {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          background: var(--card-background-color);
          border-radius: 8px;
          border: 1px solid var(--divider-color);
          margin-bottom: 8px;
        }
        
        .switch-label {
          font-size: 14px;
          font-weight: 500;
          color: var(--primary-text-color);
        }
        
        .switch {
          position: relative;
          width: 48px;
          height: 24px;
          background: var(--disabled-color);
          border-radius: 12px;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        
        .switch.on {
          background: var(--primary-color);
        }
        
        .switch-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: transform 0.3s;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .switch.on .switch-thumb {
          transform: translateX(24px);
        }
        
        .help-text {
          font-size: 12px;
          color: var(--secondary-text-color);
          margin-top: 4px;
          line-height: 1.4;
        }
        
        .warning-text {
          color: var(--warning-color);
          font-weight: 500;
        }
        
        .success-indicator {
          background: var(--success-color);
          color: white;
          padding: 8px 12px;
          border-radius: 4px;
          text-align: center;
          font-weight: 500;
        }
      </style>
      
      <div class="card-config">
        <div class="config-section">
          <div class="section-title">
            <ha-icon icon="mdi:cog"></ha-icon>
            Basic Settings
          </div>
          
          <div class="form-row full-width">
            <div class="input-group">
              <label class="label">Card Title</label>
              <input 
                type="text" 
                class="input" 
                id="title"
                value="${this._config?.title || 'YAWC Weather'}"
                placeholder="YAWC Weather"
              />
              <div class="help-text">Display name for the weather card</div>
            </div>
          </div>
          
          <div class="form-row">
            <div class="input-group">
              <label class="label">Latitude (optional)</label>
              <input 
                type="number" 
                class="input" 
                id="latitude"
                value="${this._config?.latitude || ''}"
                placeholder="40.7128"
                step="any"
              />
              <div class="help-text">Leave empty to use Home Assistant's latitude</div>
            </div>
            
            <div class="input-group">
              <label class="label">Longitude (optional)</label>
              <input 
                type="number" 
                class="input" 
                id="longitude"
                value="${this._config?.longitude || ''}"
                placeholder="-74.0060"
                step="any"
              />
              <div class="help-text">Leave empty to use Home Assistant's longitude</div>
            </div>
          </div>
          
          <div class="form-row">
            <div class="input-group">
              <label class="label">Update Interval (minutes)</label>
              <input 
                type="number" 
                class="input" 
                id="update_interval"
                value="${(this._config?.update_interval || 300000) / 60000}"
                placeholder="5"
                min="1"
                max="60"
              />
              <div class="help-text">How often to refresh weather data (1-60 minutes)</div>
            </div>
            
            <div class="input-group">
              <label class="label">Forecast Days</label>
              <input 
                type="number" 
                class="input" 
                id="forecast_days"
                value="${this._config?.forecast_days || 5}"
                placeholder="5"
                min="1"
                max="7"
              />
              <div class="help-text">Number of forecast days to display (1-7)</div>
            </div>
          </div>
        </div>
        
        <div class="config-section">
          <div class="section-title">
            <ha-icon icon="mdi:eye"></ha-icon>
            Display Options
          </div>
          
          <div class="switch-group">
            <label class="switch-label">Show Weather Alerts</label>
            <div class="switch ${this._config?.show_alerts !== false ? 'on' : ''}" id="show_alerts">
              <div class="switch-thumb"></div>
            </div>
          </div>
          <div class="help-text">Display NWS weather alerts and warnings with severity indicators</div>
          
          <div class="switch-group">
            <label class="switch-label">Show Hourly Forecast</label>
            <div class="switch ${this._config?.show_hourly !== false ? 'on' : ''}" id="show_hourly">
              <div class="switch-thumb"></div>
            </div>
          </div>
          <div class="help-text">Show scrollable 12-hour weather forecast timeline</div>
          
          <div class="switch-group">
            <label class="switch-label">Show Extended Forecast</label>
            <div class="switch ${this._config?.show_forecast !== false ? 'on' : ''}" id="show_forecast">
              <div class="switch-thumb"></div>
            </div>
          </div>
          <div class="help-text">Show detailed multi-day weather forecast with day/night periods</div>
          
          <div class="switch-group">
            <label class="switch-label">Show YAWC Branding</label>
            <div class="switch ${this._config?.show_branding !== false ? 'on' : ''}" id="show_branding">
              <div class="switch-thumb"></div>
            </div>
          </div>
          <div class="help-text">Display YAWC version information in card footer</div>
        </div>
        
        <div class="config-section">
          <div class="section-title">
            <ha-icon icon="mdi:information"></ha-icon>
            Requirements & Information
          </div>
          
          <div class="help-text">
            <strong>📍 Location:</strong> YAWC requires coordinates within US territories (including Alaska, Hawaii, and US territories) for NWS data access.<br><br>
            
            <strong>🌐 API Usage:</strong> Uses free NWS APIs with built-in rate limiting. Recommended minimum update interval is 5 minutes to respect API limits.<br><br>
            
            <strong>🎯 Features:</strong> This version includes weather alerts, hourly forecasts, detailed current conditions, and multi-day forecasts.<br><br>
            
            <strong class="warning-text">📡 Note:</strong> Animated radar and storm tracking features are planned for a future release.
          </div>
          
          <div class="success-indicator" style="margin-top: 16px;">
            ✅ Configuration Editor Working
          </div>
        </div>
      </div>
    `;
    
    this.attachEventListeners();
  }

  updateValues() {
    // Update input values when config changes
    const title = this.shadowRoot.getElementById('title');
    if (title) title.value = this._config?.title || 'YAWC Weather';
    
    const latitude = this.shadowRoot.getElementById('latitude');
    if (latitude) latitude.value = this._config?.latitude || '';
    
    const longitude = this.shadowRoot.getElementById('longitude');
    if (longitude) longitude.value = this._config?.longitude || '';
    
    const updateInterval = this.shadowRoot.getElementById('update_interval');
    if (updateInterval) updateInterval.value = (this._config?.update_interval || 300000) / 60000;
    
    const forecastDays = this.shadowRoot.getElementById('forecast_days');
    if (forecastDays) forecastDays.value = this._config?.forecast_days || 5;
    
    // Update switches
    const switches = ['show_alerts', 'show_hourly', 'show_forecast', 'show_branding'];
    switches.forEach(switchId => {
      const switchEl = this.shadowRoot.getElementById(switchId);
      if (switchEl) {
        const isOn = this._config?.[switchId] !== false;
        switchEl.classList.toggle('on', isOn);
      }
    });
  }

  attachEventListeners() {
    // Text inputs
    const inputs = ['title', 'latitude', 'longitude', 'forecast_days'];
    inputs.forEach(inputId => {
      const input = this.shadowRoot.getElementById(inputId);
      if (input) {
        input.addEventListener('input', (e) => {
          let value = e.target.value;
          
          // Handle different data types
          if (['latitude', 'longitude', 'forecast_days'].includes(inputId)) {
            value = value === '' ? null : parseFloat(value);
          }
          
          this.updateConfig(inputId, value);
        });
      }
    });

    // Update interval (special handling)
    const updateIntervalInput = this.shadowRoot.getElementById('update_interval');
    if (updateIntervalInput) {
      updateIntervalInput.addEventListener('input', (e) => {
        const minutes = parseInt(e.target.value) || 5;
        this.updateConfig('update_interval', minutes * 60000);
      });
    }

    // Toggle switches
    const switches = ['show_alerts', 'show_hourly', 'show_forecast', 'show_branding'];
    switches.forEach(switchId => {
      const switchEl = this.shadowRoot.getElementById(switchId);
      if (switchEl) {
        switchEl.addEventListener('click', () => {
          const isCurrentlyOn = switchEl.classList.contains('on');
          switchEl.classList.toggle('on', !isCurrentlyOn);
          this.updateConfig(switchId, !isCurrentlyOn);
        });
      }
    });
  }

  updateConfig(key, value) {
    const newConfig = {
      ...this._config,
      [key]: value
    };
    this._config = newConfig;
    this.configChanged(newConfig);
  }
}

// Define the custom elements (MUST have hyphens!)
customElements.define('yawc-card', YetAnotherWeatherCard);
customElements.define('yawc-card-editor', YawcCardEditor);

// Register with Home Assistant's card registry
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'yawc-card',
  name: 'YAWC - Yet Another Weather Card',
  description: 'Enhanced NWS weather card with alerts, hourly forecasts, and detailed conditions',
  preview: false,
  documentationURL: 'https://github.com/cnewman402/yawc'
});
