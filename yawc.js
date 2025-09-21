console.log('YAWC v2.1.0 - Complete NWS Implementation Loading...');

class YetAnotherWeatherCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._weatherData = null;
    this._updateInterval = null;
    this._radarFrames = [];
    this._currentFrame = 0;
    this._isPlaying = false;
    this._animationInterval = null;
    this._radarData = null;
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
      radar_height: config.radar_height || 500,
      animation_frames: config.animation_frames || 10,
      animation_speed: config.animation_speed || 500,
      latitude: config.latitude || null,
      longitude: config.longitude || null
    };
    
    console.log('YAWC NWS config loaded - Radar enabled:', this._config.show_radar);
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
    this.stopRadarAnimation();
  }

  startUpdateInterval() {
    this.stopUpdateInterval();
    var self = this;
    this._updateInterval = setInterval(function() {
      self.fetchWeatherData();
      if (self._config.show_radar) {
        self.fetchNWSRadarData();
      }
    }, this._config.update_interval);
  }

  stopUpdateInterval() {
    if (this._updateInterval) {
      clearInterval(this._updateInterval);
      this._updateInterval = null;
    }
  }

  stopRadarAnimation() {
    if (this._animationInterval) {
      clearInterval(this._animationInterval);
      this._animationInterval = null;
    }
    this._isPlaying = false;
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
          radarStation: self.findNearestNWSRadarStation(latitude, longitude),
          lastUpdated: new Date()
        };

        self.render();
        
        if (self._config.show_radar) {
          console.log('Fetching NWS radar data...');
          self.fetchNWSRadarData();
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

  async fetchNWSRadarData() {
    if (!this._weatherData || !this._weatherData.coordinates) {
      console.log('No weather data for NWS radar');
      return;
    }

    var self = this;
    var radarStation = this._weatherData.radarStation;
    
    console.log('Creating NWS radar display for station:', radarStation);
    
    this.createNWSRadarFrames(radarStation);

    this._currentFrame = Math.max(0, this._radarFrames.length - 1);
    
    this._radarData = {
      station: radarStation,
      coordinates: this._weatherData.coordinates,
      frames: this._radarFrames,
      lastUpdated: new Date()
    };

    setTimeout(function() {
      self.updateRadarDisplay();
    }, 100);
  }

  createNWSRadarFrames(station) {
    var now = new Date();
    this._radarFrames = [];
    
    for (var i = 0; i < this._config.animation_frames; i++) {
      var frameTime = new Date(now.getTime() - (i * 6 * 60 * 1000));
      var frameIndex = this._config.animation_frames - 1 - i;
      
      var placeholderUrl = this.generateNWSPlaceholder(station, frameTime, frameIndex);
      
      this._radarFrames.push({
        timestamp: frameTime,
        url: placeholderUrl,
        station: station,
        index: frameIndex,
        loaded: true,
        source: 'NWS-Info'
      });
    }
    
    this._radarFrames.reverse();
  }

  generateNWSPlaceholder(station, timestamp, frameIndex) {
    var canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    var ctx = canvas.getContext('2d');
    
    // NWS dark background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 600, 600);
    
    var centerX = 300;
    var centerY = 300;
    
    // Draw radar scope
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    
    // Range rings
    var ranges = [60, 120, 180, 240];
    ranges.forEach(function(range) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, range * 0.8, 0, 2 * Math.PI);
      ctx.stroke();
    });
    
    // Radial lines
    for (var angle = 0; angle < 360; angle += 30) {
      var rad = (angle * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(rad) * 200,
        centerY + Math.sin(rad) * 200
      );
      ctx.stroke();
    }
    
    // Station marker
    ctx.fillStyle = '#00ff00';
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(centerX, centerY, 2, 0, 2 * Math.PI);
    ctx.fill();
    
    // Labels
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('NATIONAL WEATHER SERVICE', centerX, 40);
    
    ctx.font = '12px monospace';
    ctx.fillText('NEXRAD Station: ' + station, centerX, 60);
    
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText('Live radar not available in browser', centerX, centerY - 20);
    ctx.fillText('Visit radar.weather.gov for current data', centerX, centerY + 10);
    
    // Current conditions
    if (this._weatherData && this._weatherData.current && this._weatherData.current.textDescription) {
      ctx.fillStyle = '#88ff88';
      ctx.fillText('Current: ' + this._weatherData.current.textDescription, centerX, centerY + 40);
    }
    
    // Frame info
    ctx.fillStyle = '#666666';
    ctx.font = '9px monospace';
    ctx.fillText('Frame ' + (frameIndex + 1) + ' of ' + this._config.animation_frames, centerX, 580);
    
    // Timestamp
    ctx.textAlign = 'left';
    ctx.fillText(timestamp.toISOString().substring(0, 16) + 'Z', 10, 25);
    
    return canvas.toDataURL('image/png');
  }

  findNearestNWSRadarStation(latitude, longitude) {
    var nwsRadarStations = [
      { id: 'KABR', lat: 45.456, lng: -98.413, name: 'Aberdeen, SD' },
      { id: 'KABX', lat: 35.150, lng: -106.824, name: 'Albuquerque, NM' },
      { id: 'KAMA', lat: 35.233, lng: -101.709, name: 'Amarillo, TX' },
      { id: 'KAMX', lat: 25.611, lng: -80.413, name: 'Miami, FL' },
      { id: 'KBGM', lat: 42.200, lng: -75.985, name: 'Binghamton, NY' },
      { id: 'KBMX', lat: 33.172, lng: -86.770, name: 'Birmingham, AL' },
      { id: 'KBOX', lat: 41.956, lng: -71.137, name: 'Boston, MA' },
      { id: 'KBUF', lat: 42.949, lng: -78.737, name: 'Buffalo, NY' },
      { id: 'KCLE', lat: 41.413, lng: -81.860, name: 'Cleveland, OH' },
      { id: 'KDTX', lat: 42.700, lng: -83.472, name: 'Detroit, MI' },
      { id: 'KEAX', lat: 38.810, lng: -94.264, name: 'Kansas City, MO' },
      { id: 'KEWX', lat: 29.704, lng: -98.029, name: 'Austin/San Antonio, TX' },
      { id: 'KFFC', lat: 33.364, lng: -84.566, name: 'Atlanta, GA' },
      { id: 'KFWS', lat: 32.573, lng: -97.303, name: 'Dallas/Ft. Worth, TX' },
      { id: 'KHGX', lat: 29.472, lng: -95.079, name: 'Houston, TX' },
      { id: 'KJAX', lat: 30.485, lng: -81.702, name: 'Jacksonville, FL' },
      { id: 'KLOT', lat: 41.604, lng: -88.085, name: 'Chicago, IL' },
      { id: 'KLSX', lat: 38.699, lng: -90.683, name: 'St. Louis, MO' },
      { id: 'KLWX', lat: 38.975, lng: -77.478, name: 'Sterling, VA' },
      { id: 'KMHX', lat: 34.776, lng: -76.876, name: 'Morehead City, NC' },
      { id: 'KMPX', lat: 44.849, lng: -93.566, name: 'Minneapolis, MN' },
      { id: 'KOKX', lat: 40.866, lng: -72.864, name: 'New York City, NY' },
      { id: 'KRAX', lat: 35.665, lng: -78.490, name: 'Raleigh/Durham, NC' },
      { id: 'KTBW', lat: 27.706, lng: -82.402, name: 'Tampa, FL' },
      { id: 'KTLX', lat: 35.333, lng: -97.278, name: 'Oklahoma City, OK' },
      { id: 'KTWX', lat: 38.997, lng: -96.233, name: 'Topeka, KS' }
    ];

    var nearest = nwsRadarStations[0];
    var minDistance = this.calculateDistance(latitude, longitude, nearest.lat, nearest.lng);

    for (var i = 1; i < nwsRadarStations.length; i++) {
      var station = nwsRadarStations[i];
      var distance = this.calculateDistance(latitude, longitude, station.lat, station.lng);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = station;
      }
    }

    console.log('Nearest NWS radar station:', nearest.id, nearest.name);
    return nearest.id;
  }

  calculateDistance(lat1, lng1, lat2, lng2) {
    var R = 3959;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLng = (lng2 - lng1) * Math.PI / 180;
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  startRadarAnimation() {
    this.stopRadarAnimation();
    this._isPlaying = true;
    var self = this;
    this._animationInterval = setInterval(function() {
      self._currentFrame = (self._currentFrame + 1) % self._radarFrames.length;
      self.updateRadarDisplay();
    }, this._config.animation_speed);
    this.updatePlayButton();
  }

  togglePlayback() {
    if (this._isPlaying) {
      this.stopRadarAnimation();
    } else {
      this.startRadarAnimation();
    }
  }

  previousFrame() {
    this.stopRadarAnimation();
    this._currentFrame = Math.max(0, this._currentFrame - 1);
    this.updateRadarDisplay();
  }

  nextFrame() {
    this.stopRadarAnimation();
    this._currentFrame = Math.min(this._radarFrames.length - 1, this._currentFrame + 1);
    this.updateRadarDisplay();
  }

  setFrame(frameIndex) {
    this.stopRadarAnimation();
    this._currentFrame = parseInt(frameIndex);
    this.updateRadarDisplay();
  }

  updateRadarDisplay() {
    var radarImage = this.shadowRoot.querySelector('#radar-image');
    var radarTimestamp = this.shadowRoot.querySelector('#radar-timestamp');
    var frameSlider = this.shadowRoot.querySelector('#frame-slider');
    var frameInfo = this.shadowRoot.querySelector('#frame-info');

    if (this._radarFrames && this._radarFrames.length > 0 && this._currentFrame < this._radarFrames.length) {
      var currentFrame = this._radarFrames[this._currentFrame];
      
      if (radarImage) {
        radarImage.src = currentFrame.url;
        radarImage.style.display = 'block';
        radarImage.style.opacity = '1';
      }
      
      if (radarTimestamp) {
        radarTimestamp.textContent = currentFrame.timestamp.toLocaleTimeString();
      }
      
      if (frameSlider) {
        frameSlider.value = this._currentFrame;
      }
      
      if (frameInfo) {
        frameInfo.textContent = 'Frame ' + (this._currentFrame + 1) + ' of ' + this._radarFrames.length;
      }
    }

    this.updatePlayButton();
  }

  updatePlayButton() {
    var playBtn = this.shadowRoot.querySelector('.play-btn');
    if (playBtn) {
      playBtn.textContent = this._isPlaying ? '⏸️' : '▶️';
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
      html += this.renderNWSRadarSection();
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

  renderNWSRadarSection() {
    var hasFrames = this._radarFrames && this._radarFrames.length > 0;
    var station = this._weatherData && this._weatherData.radarStation ? this._weatherData.radarStation : '';
    
    var html = '<div class="radar-section">';
    html += '<div class="section-header">🌩️ NWS NEXRAD Radar' + (station ? ' (' + station + ')' : '') + '</div>';
    
    html += '<div class="radar-display" style="height: ' + this._config.radar_height + 'px;">';
    
    if (!hasFrames) {
      html += '<div class="radar-loading">';
      html += '<div>🌩️ Loading NWS radar data...</div>';
      html += '<div style="font-size: 14px; margin-top: 8px;">NEXRAD station ' + station + '</div>';
      html += '</div>';
    } else {
      var currentFrame = this._radarFrames[this._currentFrame];
      html += '<div class="radar-map">';
      html += '<img id="radar-image" src="' + currentFrame.url + '" alt="NWS NEXRAD Radar" style="width: 100%; height: 100%; object-fit: contain; display: block;" />';
      html += '<div class="radar-timestamp" id="radar-timestamp">' + currentFrame.timestamp.toLocaleTimeString() + '</div>';
      html += '</div>';
    }
    
    html += '</div>';
    
    if (hasFrames) {
      html += '<div class="radar-animation-controls">';
      
      html += '<div class="animation-buttons">';
      html += '<button class="control-btn" onclick="this.getRootNode().host.previousFrame()">⏮️</button>';
      html += '<button class="control-btn play-btn" onclick="this.getRootNode().host.togglePlayback()">' + (this._isPlaying ? '⏸️' : '▶️') + '</button>';
      html += '<button class="control-btn" onclick="this.getRootNode().host.nextFrame()">⏭️</button>';
      html += '</div>';
      
      html += '<div class="animation-timeline">';
      html += '<input type="range" id="frame-slider" class="timeline-slider" min="0" max="' + (this._radarFrames.length - 1) + '" value="' + this._currentFrame + '" oninput="this.getRootNode().host.setFrame(this.value)" />';
      html += '</div>';
      
      html += '<div class="animation-info">';
      html += '<span id="frame-info">Frame ' + (this._currentFrame + 1) + ' of ' + this._radarFrames.length + '</span>';
      html += '<span>NWS Official Data</span>';
      html += '</div>';
      
      html += '</div>';
    }
    
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
      html += '<div class="branding">YAWC v2.1.0</div>';
    }
    html += '</div>';
    
    return html;
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
    return 'ha-card{padding:0;background:var(--card-background-color);border-radius:var(--ha-card-border-radius);box-shadow:var(--ha-card-box-shadow);overflow:hidden}.loading,.error{padding:16px;text-align:center}.error{color:var(--error-color)}.card-header{display:flex;justify-content:space-between;align-items:center;padding:16px 16px 0 16px;border-bottom:1px solid var(--divider-color);margin-bottom:16px}.title{font-size:20px;font-weight:500}.header-controls{display:flex;align-items:center;gap:12px}.last-updated{font-size:12px;color:var(--secondary-text-color)}.refresh-btn{background:none;border:none;font-size:18px;cursor:pointer;padding:4px}.alerts-section{margin:0 16px 16px 16px}.alert{margin-bottom:8px;border-radius:8px;overflow:hidden;border-left:4px solid}.alert-severe{background:var(--warning-color);border-left-color:darkorange}.alert-moderate{background:var(--info-color);border-left-color:blue}.alert-minor{background:var(--secondary-background-color);border-left-color:gray}.alert-header{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(0,0,0,0.1)}.alert-title{font-weight:bold;color:white}.alert-severity{font-size:12px;padding:2px 6px;border-radius:4px;background:rgba(0,0,0,0.2);color:white}.alert-content{padding:12px;color:white}.current-weather{margin:0 16px 16px 16px}.current-main{display:flex;align-items:center;margin-bottom:16px}.temperature-section{margin-right:16px}.temperature{font-size:48px;font-weight:300;line-height:1}.condition-info{flex:1}.condition{font-size:18px;margin-bottom:8px}.current-details{border-top:1px solid var(--divider-color);padding-top:16px}.details-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}.detail-item{display:flex;justify-content:space-between;padding:8px;background:var(--secondary-background-color);border-radius:8px}.detail-label{font-size:14px}.detail-value{font-weight:500;font-size:14px}.section-header{font-size:16px;font-weight:500;margin:16px 16px 8px 16px;padding:8px;background:var(--secondary-background-color);border-radius:4px}.radar-section{margin:0 16px 16px 16px}.radar-display{position:relative;background:#0a0a0a;border-radius:8px;border:1px solid var(--divider-color);overflow:hidden}.radar-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--secondary-text-color);font-size:18px;gap:8px}.radar-map{position:relative;width:100%;height:100%}.radar-timestamp{position:absolute;top:8px;left:8px;padding:4px 8px;background:rgba(0,0,0,0.7);color:white;border-radius:4px;font-size:12px;font-weight:500}.radar-animation-controls{padding:16px;background:var(--secondary-background-color);border-radius:8px;margin-top:8px}.animation-buttons{display:flex;justify-content:center;gap:12px;margin-bottom:16px}.control-btn{background:var(--card-background-color);border:1px solid var(--divider-color);border-radius:8px;padding:8px 12px;cursor:pointer;font-size:16px;transition:all 0.2s;color:var(--primary-text-color)}.control-btn:hover{background:var(--primary-color);color:white;border-color:var(--primary-color)}.play-btn{font-size:20px;padding:8px 16px}.animation-timeline{margin-bottom:12px}.timeline-slider{width:100%;height:8px;border-radius:4px;background:var(--divider-color);outline:none;cursor:pointer;-webkit-appearance:none}.timeline-slider::-webkit-slider-thumb{width:16px;height:16px;border-radius:50%;background:var(--primary-color);cursor:pointer;-webkit-appearance:none}.timeline-slider::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:var(--primary-color);cursor:pointer;border:none}.animation-info{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--secondary-text-color)}.hourly-section{margin:0 16px 16px 16px}.hourly-scroll{display:flex;gap:12px;overflow-x:auto;padding:8px 0}.hourly-item{display:flex;flex-direction:column;align-items:center;gap:8px;min-width:80px;padding:12px 8px;background:var(--secondary-background-color);border-radius:8px;text-align:center}.hour-time{font-size:12px;font-weight:500}.hour-temp{font-size:16px;font-weight:bold}.hour-condition{font-size:10px;opacity:0.8}.forecast-section{margin:0 16px 16px 16px}.forecast-item{display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid var(--divider-color)}.forecast-name{font-weight:500;min-width:80px}.forecast-temp{font-weight:bold;min-width:60px;text-align:center}.forecast-desc{flex:1;text-align:right;color:var(--secondary-text-color);font-size:14px}.card-footer{display:flex;justify-content:space-between;align-items:center;padding:16px;border-top:1px solid var(--divider-color);background:var(--secondary-background-color)}.data-source,.branding{font-size:12px;color:var(--secondary-text-color)}@media(max-width:600px){.animation-buttons{gap:8px}.control-btn{padding:6px 10px;font-size:14px}}';
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
      animation_frames: 10,
      animation_speed: 500,
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
    html += '<label><input type="checkbox" id="show_radar" ' + (this._config.show_radar !== false ? 'checked' : '') + '> Enable NWS NEXRAD Radar</label>';
    html += '</div>';
    
    html += '<div style="margin-bottom: 16px;">';
    html += '<label>Radar Height:</label><br>';
    html += '<input type="number" id="radar_height" value="' + (this._config.radar_height || 500) + '" min="200" max="800" style="width: 100px; padding: 4px;">';
    html += '<span style="font-size: 12px; color: #666; margin-left: 8px;">pixels</span>';
    html += '</div>';
    
    html += '<div style="margin-bottom: 16px;">';
    html += '<label>Animation Frames:</label><br>';
    html += '<input type="number" id="animation_frames" value="' + (this._config.animation_frames || 10) + '" min="5" max="20" style="width: 80px; padding: 4px;">';
    html += '<span style="font-size: 12px; color: #666; margin-left: 8px;">frames (5-20)</span>';
    html += '</div>';
    
    html += '<div style="margin-bottom: 16px;">';
    html += '<label>Animation Speed:</label><br>';
    html += '<input type="number" id="animation_speed" value="' + (this._config.animation_speed || 500) + '" min="100" max="2000" step="100" style="width: 100px; padding: 4px;">';
    html += '<span style="font-size: 12px; color: #666; margin-left: 8px;">milliseconds</span>';
    html += '</div>';
    
    html += '<div style="margin-bottom: 16px;">';
    html += '<label><input type="checkbox" id="show_alerts" ' + (this._config.show_alerts !== false ? 'checked' : '') + '> Show NWS Weather Alerts</label>';
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
    html += '✅ YAWC v2.1.0 - NWS-Only Implementation';
    html += '<div style="font-size: 12px; margin-top: 4px;">🌩️ Official National Weather Service data only</div>';
    html += '<div style="font-size: 12px; margin-top: 4px;">📡 Informational radar display with NEXRAD station info</div>';
    html += '</div>';
    
    html += '</div>';
    
    this.shadowRoot.innerHTML = html;
    this.attachEventListeners();
  }

  attachEventListeners() {
    var self = this;
    
    var inputs = ['title', 'radar_height', 'animation_frames', 'animation_speed', 'forecast_days'];
    for (var i = 0; i < inputs.length; i++) {
      var inputId = inputs[i];
      var input = this.shadowRoot.getElementById(inputId);
      if (input) {
        input.addEventListener('input', function(e) {
          var key = e.target.id;
          var value = e.target.value;
          if (['radar_height', 'animation_frames', 'animation_speed', 'forecast_days'].includes(key)) {
            value = parseInt(value) || (key === 'radar_height' ? 500 : key === 'animation_speed' ? 500 : key === 'animation_frames' ? 10 : 5);
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
  description: 'NWS-only weather card with NEXRAD radar information, alerts, and detailed forecasts',
  preview: false,
  documentationURL: 'https://github.com/cnewman402/yawc'
});

console.log('YAWC v2.1.0 - Complete NWS Implementation Loaded Successfully!');
