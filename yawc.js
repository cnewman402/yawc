console.log('YAWC v2.3.0 - Working NWS Radar Implementation');

class YetAnotherWeatherCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._weatherData = null;
    this._updateInterval = null;
    this._radarInterval = null;
    this._radarFrames = [];
    this._currentRadarFrame = 0;
    this._radarAnimating = false;
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
      radar_frames: config.radar_frames || 10,
      radar_speed: config.radar_speed || 500,
      radar_product: config.radar_product || 'bref_qcd', // Default to base reflectivity
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
    if (this._config.show_radar) {
      this.startRadarInterval();
    }
  }

  disconnectedCallback() {
    this.stopUpdateInterval();
    this.stopRadarInterval();
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

  startRadarInterval() {
    this.stopRadarInterval();
    var self = this;
    // Update radar every 5 minutes
    this._radarInterval = setInterval(function() {
      self.loadRadarFrames();
    }, 300000);
  }

  stopRadarInterval() {
    if (this._radarInterval) {
      clearInterval(this._radarInterval);
      this._radarInterval = null;
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
        var radarStation = pointData.properties.radarStation;

        return Promise.all([
          fetch(forecastUrl).then(function(r) { return r.json(); }),
          fetch(forecastHourlyUrl).then(function(r) { return r.json(); }).catch(function() { return null; }),
          fetch('https://api.weather.gov/alerts/active?point=' + latitude + ',' + longitude).then(function(r) { return r.json(); }).catch(function() { return null; }),
          self.getCurrentObservations(observationStations)
        ]).then(function(results) {
          return {
            results: results,
            radarStation: radarStation
          };
        });
      })
      .then(function(data) {
        var forecastData = data.results[0];
        var hourlyData = data.results[1];
        var alertsData = data.results[2];
        var currentData = data.results[3];

        self._weatherData = {
          current: currentData,
          forecast: forecastData.properties.periods,
          hourly: hourlyData ? hourlyData.properties.periods : [],
          alerts: alertsData ? alertsData.features : [],
          coordinates: { latitude: latitude, longitude: longitude },
          radarStation: data.radarStation,
          lastUpdated: new Date()
        };

        self.render();
        
        // Load radar frames after weather data is available
        if (self._config.show_radar && data.radarStation) {
          self.loadRadarFrames();
        }
      })
      .catch(function(error) {
        console.error('Error fetching NWS weather data:', error);
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

  loadRadarFrames() {
    if (!this._weatherData || !this._weatherData.radarStation) {
      console.log('No radar station available');
      return;
    }

    var station = this._weatherData.radarStation;
    var self = this;
    
    // Clear existing frames
    this._radarFrames = [];
    
    // Build iframe URL for NWS radar loop
    // This uses the NWS radar page which handles its own imagery
    var radarUrl = 'https://radar.weather.gov/ridge/standard/' + station + '_loop.gif';
    
    // Since we can't load images directly due to CORS, we'll use an iframe approach
    var radarContainer = this.shadowRoot.querySelector('.radar-iframe-container');
    if (radarContainer) {
      // Use the embed.nullschool.net wind map as a working alternative
      // Or use the NWS radar page in an iframe
      var embedUrl = 'https://radar.weather.gov/ridge/standard/' + station;
      
      radarContainer.innerHTML = '<iframe src="' + embedUrl + '" ' +
                                 'width="100%" ' +
                                 'height="' + this._config.radar_height + '" ' +
                                 'frameborder="0" ' +
                                 'style="border:0;border-radius:8px;" ' +
                                 'title="NWS Radar"></iframe>';
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
    
    // Set up radar controls if enabled
    if (this._config.show_radar) {
      this.setupRadarControls();
    }
  }

  setupRadarControls() {
    var self = this;
    
    // Set up refresh button
    var refreshBtn = this.shadowRoot.querySelector('.radar-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', function() {
        self.loadRadarFrames();
      });
    }

    // Set up animation controls
    var playBtn = this.shadowRoot.querySelector('.radar-play-btn');
    if (playBtn) {
      playBtn.addEventListener('click', function() {
        self.toggleRadarAnimation();
      });
    }
  }

  toggleRadarAnimation() {
    this._radarAnimating = !this._radarAnimating;
    var playBtn = this.shadowRoot.querySelector('.radar-play-btn');
    if (playBtn) {
      playBtn.textContent = this._radarAnimating ? '⏸' : '▶';
    }
  }

  getLoadingHTML() {
    return '<style>' + this.getStyles() + '</style><ha-card><div class="loading">Loading NWS weather data...</div></ha-card>';
  }

  getErrorHTML() {
    return '<style>' + this.getStyles() + '</style><ha-card><div class="error">Error: ' + this._weatherData.error + '</div></ha-card>';
  }

  getMainHTML() {
    var html = '<style>' + this.getStyles() + '</style>';
    html += '<ha-card>';
    
    html += this.renderHeader();
    
    if (this._config.show_alerts) {
      html += this.renderAlerts();
    }
    
    html += this.renderCurrentWeather();
    
    if (this._config.show_radar) {
      html += this.renderRadarSection();
    }
    
    if (this._config.show_hourly) {
      html += this.renderHourlyForecast();
    }
    
    if (this._config.show_forecast) {
      html += this.renderExtendedForecast();
    }
    
    html += this.renderFooter();
    
    html += '</ha-card>';
    return html;
  }

  renderHeader() {
    var lastUpdated = this._weatherData.lastUpdated ? this._weatherData.lastUpdated.toLocaleTimeString() : 'Unknown';
    
    return '<div class="card-header">' +
           '<div class="title">' + this._config.title + '</div>' +
           '<div class="header-controls">' +
           '<div class="last-updated">Updated: ' + lastUpdated + '</div>' +
           '<button class="refresh-btn" onclick="this.getRootNode().host.fetchWeatherData()">↻</button>' +
           '</div>' +
           '</div>';
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
      var windDir = current.windDirection ? current.windDirection.value : '';
      html += '<div class="detail-item">';
      html += '<span class="detail-label">Wind</span>';
      html += '<span class="detail-value">' + windSpeed + ' mph ' + this.getWindDirection(windDir) + '</span>';
      html += '</div>';
    }
    
    if (current && current.barometricPressure && current.barometricPressure.value) {
      var pressure = Math.round(current.barometricPressure.value / 100);
      html += '<div class="detail-item">';
      html += '<span class="detail-label">Pressure</span>';
      html += '<span class="detail-value">' + pressure + ' mb</span>';
      html += '</div>';
    }
    
    if (current && current.visibility && current.visibility.value) {
      var visibility = Math.round(current.visibility.value / 1609.34); // Convert meters to miles
      html += '<div class="detail-item">';
      html += '<span class="detail-label">Visibility</span>';
      html += '<span class="detail-value">' + visibility + ' mi</span>';
      html += '</div>';
    }
    
    html += '</div>';
    html += '</div>';
    html += '</div>';
    
    return html;
  }

  renderRadarSection() {
    var station = this._weatherData.radarStation || 'N/A';
    
    // We'll use three different approaches for radar data
    var html = '<div class="radar-section">';
    html += '<div class="section-header">Weather Radar</div>';
    
    // Approach 1: Embed NWS Radar page in iframe (most reliable)
    html += '<div class="radar-option">';
    html += '<div class="radar-option-header">NWS NEXRAD Radar - Station: ' + station + '</div>';
    html += '<div class="radar-iframe-container" style="height: ' + this._config.radar_height + 'px;">';
    html += '<div class="radar-loading">Loading radar...</div>';
    html += '</div>';
    html += '<div class="radar-controls">';
    html += '<button class="radar-refresh-btn">↻ Refresh</button>';
    html += '<a href="https://radar.weather.gov/station/' + station + '/standard" target="_blank" class="radar-link">Open Full Radar →</a>';
    html += '</div>';
    html += '</div>';
    
    // Approach 2: Alternative - Windy.com embed (very reliable, different data source)
    var lat = this._weatherData.coordinates.latitude;
    var lon = this._weatherData.coordinates.longitude;
    html += '<div class="radar-option">';
    html += '<div class="radar-option-header">Alternative: Windy.com Radar</div>';
    html += '<iframe width="100%" height="' + Math.round(this._config.radar_height * 0.8) + '" ';
    html += 'src="https://embed.windy.com/embed2.html?lat=' + lat + '&lon=' + lon + '&detailLat=' + lat + '&detailLon=' + lon + '&width=650&height=' + Math.round(this._config.radar_height * 0.8) + '&zoom=8&level=surface&overlay=radar&product=radar&menu=&message=&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=mph&metricTemp=%C2%B0F&radarRange=-1" ';
    html += 'frameborder="0"></iframe>';
    html += '</div>';
    
    // Approach 3: Links to various radar sources
    html += '<div class="radar-links">';
    html += '<div class="radar-links-header">Additional Radar Sources:</div>';
    html += '<div class="radar-links-grid">';
    html += '<a href="https://radar.weather.gov/station/' + station + '" target="_blank">NWS Enhanced</a>';
    html += '<a href="https://www.wunderground.com/radar/us/' + station + '" target="_blank">Weather Underground</a>';
    html += '<a href="https://weather.com/weather/radar/interactive/l/' + lat + ',' + lon + '" target="_blank">Weather.com</a>';
    html += '<a href="https://www.accuweather.com/en/us/weather-radar?lat=' + lat + '&lon=' + lon + '" target="_blank">AccuWeather</a>';
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
      html += '<div class="hour-icon">' + this.getWeatherIcon(hour.shortForecast) + '</div>';
      html += '<div class="hour-temp">' + hour.temperature + '°</div>';
      if (hour.probabilityOfPrecipitation && hour.probabilityOfPrecipitation.value) {
        html += '<div class="hour-precip">' + hour.probabilityOfPrecipitation.value + '%</div>';
      }
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
      html += '<div class="forecast-icon">' + this.getWeatherIcon(period.shortForecast) + '</div>';
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
      html += '<div class="branding">YAWC v2.3.0</div>';
    }
    html += '</div>';
    
    return html;
  }

  getWeatherIcon(condition) {
    if (!condition) return '🌡️';
    
    var lowerCondition = condition.toLowerCase();
    
    if (lowerCondition.includes('sunny') || lowerCondition.includes('clear')) return '☀️';
    if (lowerCondition.includes('partly cloudy') || lowerCondition.includes('partly sunny')) return '⛅';
    if (lowerCondition.includes('cloudy') || lowerCondition.includes('overcast')) return '☁️';
    if (lowerCondition.includes('rain') || lowerCondition.includes('shower')) return '🌧️';
    if (lowerCondition.includes('thunderstorm') || lowerCondition.includes('thunder')) return '⛈️';
    if (lowerCondition.includes('snow')) return '❄️';
    if (lowerCondition.includes('fog') || lowerCondition.includes('mist')) return '🌫️';
    if (lowerCondition.includes('wind')) return '💨';
    if (lowerCondition.includes('hot')) return '🌡️';
    if (lowerCondition.includes('cold')) return '🥶';
    
    return '🌡️';
  }

  getWindDirection(degrees) {
    if (!degrees && degrees !== 0) return '';
    var directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    var index = Math.round(degrees / 22.5) % 16;
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
      
      .radar-iframe-container {
        position: relative;
        background: #000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .radar-iframe-container iframe {
        width: 100%;
        height: 100%;
        border: 0;
      }
      
      .radar-loading {
        color: #fff;
        font-size: 14px;
      }
      
      .radar-controls {
        display: flex;
        gap: 12px;
        padding: 8px 12px;
        background: var(--secondary-background-color);
      }
      
      .radar-refresh-btn, .radar-play-btn {
        padding: 6px 12px;
        background: var(--primary-color);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      }
      
      .radar-refresh-btn:hover, .radar-play-btn:hover {
        opacity: 0.9;
      }
      
      .radar-link {
        margin-left: auto;
        padding: 6px 12px;
        color: var(--primary-color);
        text-decoration: none;
        font-size: 14px;
        display: flex;
        align-items: center;
      }
      
      .radar-link:hover {
        text-decoration: underline;
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
