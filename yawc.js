console.log('YAWC v2.0.0 Loading...');

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
    
    this._config = {};
    this._config.title = config.title || 'YAWC Weather';
    this._config.update_interval = config.update_interval || 300000;
    this._config.show_alerts = config.show_alerts !== false;
    this._config.show_forecast = config.show_forecast !== false;
    this._config.show_hourly = config.show_hourly !== false;
    this._config.show_radar = config.show_radar !== false;
    this._config.show_branding = config.show_branding !== false;
    this._config.forecast_days = config.forecast_days || 5;
    this._config.radar_height = config.radar_height || 500;
    this._config.latitude = config.latitude;
    this._config.longitude = config.longitude;
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
    var self = this;
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

  fetchWeatherData() {
    if (!this._hass) return;

    var self = this;
    var latitude = this._config.latitude || this._hass.config.latitude;
    var longitude = this._config.longitude || this._hass.config.longitude;

    if (!latitude || !longitude) {
      this._weatherData = { error: 'No coordinates available' };
      this.render();
      return;
    }

    var pointUrl = 'https://api.weather.gov/points/' + latitude + ',' + longitude;
    
    fetch(pointUrl)
      .then(function(response) {
        if (!response.ok) throw new Error('Failed to get NWS point data');
        return response.json();
      })
      .then(function(pointData) {
        var forecastUrl = pointData.properties.forecast;
        var forecastHourlyUrl = pointData.properties.forecastHourly;
        var observationStations = pointData.properties.observationStations;
        var office = pointData.properties.gridId;

        // Get forecast data
        return Promise.all([
          fetch(forecastUrl).then(function(r) { return r.json(); }),
          fetch(forecastHourlyUrl).then(function(r) { return r.json(); }).catch(function() { return null; }),
          fetch('https://api.weather.gov/alerts/active?point=' + latitude + ',' + longitude).then(function(r) { return r.json(); }).catch(function() { return null; }),
          self.getCurrentObservations(observationStations)
        ]);
      })
      .then(function(results) {
        var forecastData = results[0];
        var hourlyData = results[1];
        var alertsData = results[2];
        var currentData = results[3];

        self._weatherData = {
          current: currentData,
          forecast: forecastData.properties.periods,
          hourly: hourlyData ? hourlyData.properties.periods : [],
          alerts: alertsData ? alertsData.features : [],
          coordinates: { latitude: latitude, longitude: longitude },
          lastUpdated: new Date()
        };

        self.render();
      })
      .catch(function(error) {
        console.error('Error fetching weather data:', error);
        self._weatherData = { 
          error: error.message,
          lastUpdated: new Date()
        };
        self.render();
      });
  }

  getCurrentObservations(observationStations) {
    return fetch(observationStations)
      .then(function(response) { return response.json(); })
      .then(function(stationsData) {
        if (!stationsData.features || stationsData.features.length === 0) {
          return null;
        }
        
        var station = stationsData.features[0];
        return fetch(station.id + '/observations/latest')
          .then(function(response) {
            if (response.ok) {
              return response.json().then(function(obsData) {
                return obsData.properties;
              });
            }
            return null;
          })
          .catch(function() {
            return null;
          });
      })
      .catch(function() {
        return null;
      });
  }

  render() {
    if (!this._hass) return;

    var currentTime = new Date().toLocaleString();

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
    return '<style>' + this.getStyles() + '</style><ha-card><div class="loading">Loading weather data...</div></ha-card>';
  }

  getErrorHTML() {
    return '<style>' + this.getStyles() + '</style><ha-card><div class="error">Error: ' + this._weatherData.error + '</div></ha-card>';
  }

  getMainHTML() {
    var html = '<style>' + this.getStyles() + '</style>';
    html += '<ha-card>';
    
    // Header
    html += this.renderHeader();
    
    // Alerts
    if (this._config.show_alerts) {
      html += this.renderAlerts();
    }
    
    // Current Weather
    html += this.renderCurrentWeather();
    
    // Radar Section
    if (this._config.show_radar) {
      html += this.renderRadarSection();
    }
    
    // Hourly Forecast
    if (this._config.show_hourly) {
      html += this.renderHourlyForecast();
    }
    
    // Extended Forecast
    if (this._config.show_forecast) {
      html += this.renderExtendedForecast();
    }
    
    // Footer
    html += this.renderFooter();
    
    html += '</ha-card>';
    return html;
  }

  renderHeader() {
    var lastUpdated = this._weatherData.lastUpdated ? this._weatherData.lastUpdated.toLocaleTimeString() : 'Unknown';
    
    var html = '<div class="card-header">';
    html += '<div class="title">' + this._config.title + '</div>';
    html += '<div class="header-controls">';
    html += '<div class="last-updated">Updated: ' + lastUpdated + '</div>';
    html += '<button class="refresh-btn" onclick="this.getRootNode().host.fetchWeatherData()">↻</button>';
    html += '</div>';
    html += '</div>';
    
    return html;
  }

  renderAlerts() {
    if (!this._weatherData.alerts || this._weatherData.alerts.length === 0) {
      return '';
    }

    var html = '<div class="alerts-section">';
    
    for (var i = 0; i < this._weatherData.alerts.length; i++) {
      var alert = this._weatherData.alerts[i];
      var props = alert.properties;
      var severity = props.severity || 'Minor';
      
      html += '<div class="alert alert-' + severity.toLowerCase() + '">';
      html += '<div class="alert-header">';
      html += '<span class="alert-title">' + props.event + '</span>';
      html += '<span class="alert-severity">' + severity + '</span>';
      html += '</div>';
      html += '<div class="alert-content">';
      html += '<div class="alert-headline">' + props.headline + '</div>';
      html += '</div>';
      html += '</div>';
    }
    
    html += '</div>';
    return html;
  }

  renderCurrentWeather() {
    var current = this._weatherData.current;
    var forecast = this._weatherData.forecast;
    
    var temperature = 'N/A';
    if (current && current.temperature && current.temperature.value) {
      temperature = Math.round(this.celsiusToFahrenheit(current.temperature.value));
    } else if (forecast && forecast[0]) {
      var match = forecast[0].temperature.toString().match(/\d+/);
      temperature = match ? match[0] : 'N/A';
    }

    var condition = 'Unknown';
    if (current && current.textDescription) {
      condition = current.textDescription;
    } else if (forecast && forecast[0] && forecast[0].shortForecast) {
      condition = forecast[0].shortForecast;
    }

    var html = '<div class="current-weather">';
    html += '<div class="current-main">';
    html += '<div class="temperature-section">';
    html += '<div class="temperature">' + temperature + '°</div>';
    html += '</div>';
    html += '<div class="condition-info">';
    html += '<div class="condition">' + condition + '</div>';
    html += '</div>';
    html += '</div>';

    // Details
    html += '<div class="current-details">';
    html += '<div class="details-grid">';
    
    if (current && current.relativeHumidity && current.relativeHumidity.value) {
      html += '<div class="detail-item">';
      html += '<span class="detail-label">Humidity</span>';
      html += '<span class="detail-value">' + Math.round(current.relativeHumidity.value) + '%</span>';
      html += '</div>';
    }
    
    if (current && current.windSpeed && current.windSpeed.value) {
      var windSpeed = Math.round(this.mpsToMph(current.windSpeed.value));
      html += '<div class="detail-item">';
      html += '<span class="detail-label">Wind</span>';
      html += '<span class="detail-value">' + windSpeed + ' mph</span>';
      html += '</div>';
    }
    
    if (current && current.barometricPressure && current.barometricPressure.value) {
      var pressure = Math.round(current.barometricPressure.value / 100);
      html += '<div class="detail-item">';
      html += '<span class="detail-label">Pressure</span>';
      html += '<span class="detail-value">' + pressure + ' mb</span>';
      html += '</div>';
    }
    
    html += '<div class="detail-item">';
    html += '<span class="detail-label">Location</span>';
    html += '<span class="detail-value">' + this._weatherData.coordinates.latitude.toFixed(2) + ', ' + this._weatherData.coordinates.longitude.toFixed(2) + '</span>';
    html += '</div>';
    
    html += '</div>';
    html += '</div>';
    html += '</div>';
    
    return html;
  }

  renderRadarSection() {
    var html = '<div class="radar-section">';
    html += '<div class="section-header">Animated Radar</div>';
    html += '<div class="radar-display" style="height: ' + this._config.radar_height + 'px;">';
    html += '<div class="radar-placeholder">';
    html += '<div>🌩️ Radar System</div>';
    html += '<div style="margin-top: 8px; font-size: 14px;">Advanced radar features will be added here</div>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    
    return html;
  }

  renderHourlyForecast() {
    if (!this._weatherData.hourly || this._weatherData.hourly.length === 0) {
      return '';
    }

    var html = '<div class="hourly-section">';
    html += '<div class="section-header">Hourly Forecast</div>';
    html += '<div class="hourly-scroll">';
    
    var hourlyData = this._weatherData.hourly.slice(0, 12);
    for (var i = 0; i < hourlyData.length; i++) {
      var hour = hourlyData[i];
      var time = new Date(hour.startTime);
      var timeStr = time.toLocaleTimeString([], { hour: 'numeric' });
      
      html += '<div class="hourly-item">';
      html += '<div class="hour-time">' + timeStr + '</div>';
      html += '<div class="hour-temp">' + hour.temperature + '°</div>';
      html += '<div class="hour-condition">' + this.truncateText(hour.shortForecast, 15) + '</div>';
      html += '</div>';
    }
    
    html += '</div>';
    html += '</div>';
    
    return html;
  }

  renderExtendedForecast() {
    if (!this._weatherData.forecast || this._weatherData.forecast.length === 0) {
      return '';
    }

    var html = '<div class="forecast-section">';
    html += '<div class="section-header">' + this._config.forecast_days + '-Day Forecast</div>';
    
    var maxPeriods = Math.min(this._config.forecast_days * 2, this._weatherData.forecast.length);
    for (var i = 0; i < maxPeriods; i++) {
      var period = this._weatherData.forecast[i];
      
      html += '<div class="forecast-item">';
      html += '<div class="forecast-name">' + period.name + '</div>';
      html += '<div class="forecast-temp">' + period.temperature + '°' + period.temperatureUnit + '</div>';
      html += '<div class="forecast-desc">' + period.shortForecast + '</div>';
      html += '</div>';
    }
    
    html += '</div>';
    
    return html;
  }

  renderFooter() {
    var html = '<div class="card-footer">';
    html += '<div class="data-source">Data from National Weather Service</div>';
    if (this._config.show_branding) {
      html += '<div class="branding">YAWC v2.0.0</div>';
    }
    html += '</div>';
    
    return html;
  }

  // Utility functions
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
    return 'ha-card{padding:0;background:var(--card-background-color);border-radius:var(--ha-card-border-radius);box-shadow:var(--ha-card-box-shadow);overflow:hidden}.loading,.error{padding:16px;text-align:center}.error{color:var(--error-color)}.card-header{display:flex;justify-content:space-between;align-items:center;padding:16px 16px 0 16px;border-bottom:1px solid var(--divider-color);margin-bottom:16px}.title{font-size:20px;font-weight:500}.header-controls{display:flex;align-items:center;gap:12px}.last-updated{font-size:12px;color:var(--secondary-text-color)}.refresh-btn{background:none;border:none;font-size:18px;cursor:pointer;padding:4px}.alerts-section{margin:0 16px 16px 16px}.alert{margin-bottom:8px;border-radius:8px;overflow:hidden;border-left:4px solid}.alert-severe{background:var(--warning-color);border-left-color:darkorange}.alert-moderate{background:var(--info-color);border-left-color:blue}.alert-minor{background:var(--secondary-background-color);border-left-color:gray}.alert-header{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(0,0,0,0.1)}.alert-title{font-weight:bold;color:white}.alert-severity{font-size:12px;padding:2px 6px;border-radius:4px;background:rgba(0,0,0,0.2);color:white}.alert-content{padding:12px;color:white}.current-weather{margin:0 16px 16px 16px}.current-main{display:flex;align-items:center;margin-bottom:16px}.temperature-section{margin-right:16px}.temperature{font-size:48px;font-weight:300;line-height:1}.condition-info{flex:1}.condition{font-size:18px;margin-bottom:8px}.current-details{border-top:1px solid var(--divider-color);padding-top:16px}.details-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}.detail-item{display:flex;justify-content:space-between;padding:8px;background:var(--secondary-background-color);border-radius:8px}.detail-label{font-size:14px}.detail-value{font-weight:500;font-size:14px}.section-header{font-size:16px;font-weight:500;margin:16px 16px 8px 16px;padding:8px;background:var(--secondary-background-color);border-radius:4px}.radar-section{margin:0 16px 16px 16px}.radar-display{background:#f0f0f0;border-radius:8px;border:1px solid var(--divider-color);display:flex;align-items:center;justify-content:center}.radar-placeholder{text-align:center;padding:50px;color:#666}.hourly-section{margin:0 16px 16px 16px}.hourly-scroll{display:flex;gap:12px;overflow-x:auto;padding:8px 0}.hourly-item{display:flex;flex-direction:column;align-items:center;gap:8px;min-width:80px;padding:12px 8px;background:var(--secondary-background-color);border-radius:8px;text-align:center}.hour-time{font-size:12px;font-weight:500}.hour-temp{font-size:16px;font-weight:bold}.hour-condition{font-size:10px;opacity:0.8}.forecast-section{margin:0 16px 16px 16px}.forecast-item{display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid var(--divider-color)}.forecast-name{font-weight:500;min-width:80px}.forecast-temp{font-weight:bold;min-width:60px;text-align:center}.forecast-desc{flex:1;text-align:right;color:var(--secondary-text-color);font-size:14px}.card-footer{display:flex;justify-content:space-between;align-items:center;padding:16px;border-top:1px solid var(--divider-color);background:var(--secondary-background-color)}.data-source,.branding{font-size:12px;color:var(--secondary-text-color)}';
  }

  getCardSize() {
    var size = 4;
    if (this._config.show_hourly) size += 1;
    if (this._config.show_radar) size += 2;
    return size;
  }

  static getConfigElement() {
    return document.createElement('yawc-card-editor');
  }

  static getStubConfig() {
    return {
      title: 'YAWC Weather',
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
    this._config = config || {};
    this.render();
  }

  configChanged(newConfig) {
    var event = new Event('config-changed', {
      bubbles: true,
      composed: true,
    });
    event.detail = { config: newConfig };
    this.dispatchEvent(event);
  }

  render() {
    var html = '<div style="padding: 16px;">';
    
    html += '<div style="margin-bottom: 16px;">';
    html += '<label>Card Title:</label><br>';
    html += '<input type="text" id="title" value="' + (this._config.title || 'YAWC Weather') + '" style="width: 100%; padding: 8px; margin-top: 4px;">';
    html += '</div>';
    
    html += '<div style="margin-bottom: 16px;">';
    html += '<label><input type="checkbox" id="show_radar" ' + (this._config.show_radar !== false ? 'checked' : '') + '> Enable Radar</label>';
    html += '</div>';
    
    html += '<div style="margin-bottom: 16px;">';
    html += '<label>Radar Height:</label><br>';
    html += '<input type="number" id="radar_height" value="' + (this._config.radar_height || 500) + '" min="200" max="800" style="width: 100px; padding: 4px;">';
    html += '<span style="font-size: 12px; color: #666; margin-left: 8px;">pixels</span>';
    html += '</div>';
    
    html += '<div style="margin-bottom: 16px;">';
    html += '<label><input type="checkbox" id="show_alerts" ' + (this._config.show_alerts !== false ? 'checked' : '') + '> Show Weather Alerts</label>';
    html += '</div>';
    
    html += '<div style="margin-bottom: 16px;">';
    html += '<label><input type="checkbox" id="show_hourly" ' + (this._config.show_hourly !== false ? 'checked' : '') + '> Show Hourly Forecast</label>';
    html += '</div>';
    
    html += '<div style="margin-bottom: 16px;">';
    html += '<label><input type="checkbox" id="show_forecast" ' + (this._config.show_forecast !== false ? 'checked' : '') + '> Show Extended Forecast</label>';
    html += '</div>';
    
    html += '<div style="margin-bottom: 16px;">';
    html += '<label>Forecast Days:</label><br>';
    html += '<input type="number" id="forecast_days" value="' + (this._config.forecast_days || 5) + '" min="1" max="7" style="width: 60px; padding: 4px;">';
    html += '</div>';
    
    html += '<div style="background: #e8f5e8; padding: 12px; border-radius: 4px; margin-top: 16px;">';
    html += '✅ YAWC Weather Card Configuration';
    html += '</div>';
    
    html += '</div>';
    
    this.shadowRoot.innerHTML = html;
    this.attachEventListeners();
  }

  attachEventListeners() {
    var self = this;
    
    var inputs = ['title', 'radar_height', 'forecast_days'];
    for (var i = 0; i < inputs.length; i++) {
      var inputId = inputs[i];
      var input = this.shadowRoot.getElementById(inputId);
      if (input) {
        input.addEventListener('input', function(e) {
          var key = e.target.id;
          var value = e.target.value;
          if (key === 'radar_height' || key === 'forecast_days') {
            value = parseInt(value) || (key === 'radar_height' ? 500 : 5);
          }
          self.updateConfig(key, value);
        });
      }
    }

    var checkboxes = ['show_radar', 'show_alerts', 'show_hourly', 'show_forecast'];
    for (var i = 0; i < checkboxes.length; i++) {
      var checkboxId = checkboxes[i];
      var checkbox = this.shadowRoot.getElementById(checkboxId);
      if (checkbox) {
        checkbox.addEventListener('change', function(e) {
          self.updateConfig(e.target.id, e.target.checked);
        });
      }
    }
  }

  updateConfig(key, value) {
    var newConfig = {};
    for (var prop in this._config) {
      newConfig[prop] = this._config[prop];
    }
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
  name: 'YAWC - Yet Another Weather Card',
  description: 'Complete weather card with NWS data and radar support',
  preview: false,
  documentationURL: 'https://github.com/cnewman402/yawc'
});

console.log('YAWC v2.0.0 Loaded Successfully!');
