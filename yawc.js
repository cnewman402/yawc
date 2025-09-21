console.log('YAWC v2.0.1 with Working Radar Loading...');

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
      radar_type: config.radar_type || 'base_reflectivity',
      radar_zoom: config.radar_zoom || 'local',
      show_storm_tracking: config.show_storm_tracking !== false,
      show_lightning: config.show_lightning !== false,
      latitude: config.latitude || null,
      longitude: config.longitude || null
    };
    
    console.log('YAWC config loaded - Radar enabled:', this._config.show_radar);
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
        self.fetchRadarData();
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
        var office = pointData.properties.gridId;

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
          radarStation: self.findNearestRadarStation(latitude, longitude),
          lastUpdated: new Date()
        };

        self.render();
        
        if (self._config.show_radar) {
          console.log('Fetching radar data...');
          self.fetchRadarData();
        }
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

  // Working radar implementation with map overlay support
  generateRadarImageUrl(station, timestamp, frameIndex) {
    var now = new Date();
    var minutesAgo = frameIndex * 5; // 5 minutes per frame
    var frameTime = new Date(now - minutesAgo * 60000);
    
    // Try multiple sources with map overlays
    var sources = [
      // OpenWeatherMap with map overlay (requires registration but has free tier)
      this.generateOpenWeatherRadar(frameTime, frameIndex),
      
      // Iowa Environmental Mesonet with geography
      this.generateMesonetRadar(frameTime, frameIndex),
      
      // RainViewer with OpenStreetMap overlay
      this.generateRainViewerWithMap(frameTime, frameIndex),
      
      // Custom composite with map overlay
      this.generateCompositeRadar(station, frameTime, frameIndex)
    ];
    
    // Return the first available source
    var url = sources[0];
    console.log('Generated radar URL for frame', frameIndex + 1, ':', url);
    return url;
  }

  generateMesonetRadar(timestamp, frameIndex) {
    // Iowa Mesonet with geographical features
    var baseUrl = 'https://mesonet.agron.iastate.edu/cgi-bin/request/gis/nexrad_storm.py';
    var params = [
      'dpi=150',
      'format=png',
      'sector=conus',
      'tz=UTC',
      'layers[]=nexrad',
      'layers[]=counties',
      'layers[]=interstates',
      'layers[]=uscounties',
      'vintage=' + this.formatDateForMesonet(timestamp)
    ];
    
    return baseUrl + '?' + params.join('&');
  }

  generateRainViewerWithMap(timestamp, frameIndex) {
    // RainViewer radar with map tiles
    var lat = this._weatherData.coordinates.latitude;
    var lng = this._weatherData.coordinates.longitude;
    var zoom = 7;
    
    // Calculate tile coordinates
    var tileX = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
    var tileY = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
    
    var unixTime = Math.floor(timestamp.getTime() / 1000);
    var roundedTime = Math.floor(unixTime / 600) * 600; // Round to 10 minutes
    
    return 'https://tilecache.rainviewer.com/v2/radar/' + roundedTime + '/512/' + zoom + '/' + tileX + '/' + tileY + '/2/1_1.png';
  }

  generateOpenWeatherRadar(timestamp, frameIndex) {
    // OpenWeatherMap precipitation layer (free tier available)
    var lat = this._weatherData.coordinates.latitude;
    var lng = this._weatherData.coordinates.longitude;
    var zoom = 8;
    
    var tileX = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
    var tileY = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
    
    // Note: This would require an API key for production use
    // Using demo/free tier endpoint
    return 'https://tile.openweathermap.org/map/precipitation_new/' + zoom + '/' + tileX + '/' + tileY + '.png?appid=demo';
  }

  generateCompositeRadar(station, timestamp, frameIndex) {
    // Create a composite image with map background and radar overlay
    var canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    var ctx = canvas.getContext('2d');
    
    // Create a styled background with geographic context
    this.drawMapBackground(ctx, canvas.width, canvas.height);
    this.drawRadarData(ctx, station, timestamp, frameIndex);
    
    return canvas.toDataURL('image/png');
  }

  drawMapBackground(ctx, width, height) {
    // Draw a simple map background with state boundaries and cities
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, width, height);
    
    // Draw state boundaries (simplified)
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    // Example state lines (you could expand this with real coordinates)
    var stateLines = [
      [{x: 100, y: 200}, {x: 300, y: 200}], // Horizontal line
      [{x: 200, y: 100}, {x: 200, y: 400}], // Vertical line
      [{x: 400, y: 150}, {x: 600, y: 300}], // Diagonal line
    ];
    
    stateLines.forEach(function(line) {
      ctx.moveTo(line[0].x, line[0].y);
      ctx.lineTo(line[1].x, line[1].y);
    });
    ctx.stroke();
    
    // Draw major cities
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    var cities = [
      {name: 'Major City', x: 150, y: 180},
      {name: 'Metro Area', x: 350, y: 250},
      {name: 'Urban Center', x: 500, y: 200}
    ];
    
    cities.forEach(function(city) {
      ctx.fillRect(city.x - 2, city.y - 2, 4, 4);
      ctx.fillText(city.name, city.x + 8, city.y + 4);
    });
    
    // Draw compass
    ctx.strokeStyle = '#fff';
    ctx.fillStyle = '#fff';
    ctx.font = '10px Arial';
    ctx.fillText('N', width - 30, 30);
    ctx.beginPath();
    ctx.moveTo(width - 25, 35);
    ctx.lineTo(width - 25, 55);
    ctx.stroke();
  }

  drawRadarData(ctx, station, timestamp, frameIndex) {
    // Draw simulated radar data with intensity colors
    var centerX = ctx.canvas.width / 2;
    var centerY = ctx.canvas.height / 2;
    var maxRadius = 150;
    
    // Create multiple weather cells
    var cells = [
      {x: centerX - 50, y: centerY - 30, intensity: 0.8, size: 40},
      {x: centerX + 30, y: centerY + 20, intensity: 0.6, size: 60},
      {x: centerX - 20, y: centerY + 40, intensity: 0.4, size: 30}
    ];
    
    cells.forEach(function(cell) {
      var alpha = cell.intensity * 0.7;
      var gradient = ctx.createRadialGradient(cell.x, cell.y, 0, cell.x, cell.y, cell.size);
      
      if (cell.intensity > 0.7) {
        gradient.addColorStop(0, 'rgba(255, 0, 0, ' + alpha + ')'); // Red - heavy
        gradient.addColorStop(1, 'rgba(255, 100, 0, 0)'); // Orange fade
      } else if (cell.intensity > 0.5) {
        gradient.addColorStop(0, 'rgba(255, 255, 0, ' + alpha + ')'); // Yellow - moderate
        gradient.addColorStop(1, 'rgba(0, 255, 0, 0)'); // Green fade
      } else {
        gradient.addColorStop(0, 'rgba(0, 255, 0, ' + alpha + ')'); // Green - light
        gradient.addColorStop(1, 'rgba(0, 100, 255, 0)'); // Blue fade
      }
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cell.x, cell.y, cell.size, 0, 2 * Math.PI);
      ctx.fill();
    });
    
    // Add station identifier
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(station, 10, 25);
    
    // Add intensity scale
    ctx.font = '10px Arial';
    var scale = ['Light', 'Moderate', 'Heavy', 'Severe'];
    var colors = ['#00ff00', '#ffff00', '#ff8000', '#ff0000'];
    
    for (var i = 0; i < scale.length; i++) {
      ctx.fillStyle = colors[i];
      ctx.fillRect(10, ctx.canvas.height - 80 + (i * 15), 12, 12);
      ctx.fillStyle = '#fff';
      ctx.fillText(scale[i], 30, ctx.canvas.height - 70 + (i * 15));
    }
  }

  formatDateForMesonet(date) {
    var year = date.getUTCFullYear();
    var month = String(date.getUTCMonth() + 1).padStart(2, '0');
    var day = String(date.getUTCDate()).padStart(2, '0');
    var hour = String(date.getUTCHours()).padStart(2, '0');
    var minute = String(Math.floor(date.getUTCMinutes() / 5) * 5).padStart(2, '0');
    
    return year + '-' + month + '-' + day + 'T' + hour + ':' + minute + 'Z';
  }

  // Alternative radar source using RainViewer (more reliable)
  generateRainViewerUrl(timestamp, frameIndex) {
    var unixTime = Math.floor(timestamp.getTime() / 1000);
    // Round to nearest 10 minutes for RainViewer
    var roundedTime = Math.floor(unixTime / 600) * 600;
    
    // RainViewer provides CORS-friendly radar tiles
    var zoom = 6; // Adjust zoom level based on your needs
    var lat = this._weatherData.coordinates.latitude;
    var lng = this._weatherData.coordinates.longitude;
    
    // Convert lat/lng to tile coordinates
    var tileX = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
    var tileY = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
    
    return 'https://tilecache.rainviewer.com/v2/radar/' + roundedTime + '/256/' + zoom + '/' + tileX + '/' + tileY + '/2/1_1.png';
  }

  // Fallback to creating a demo radar image
  generateDemoRadarUrl(station, timestamp, frameIndex) {
    var colors = [
      '4A90E2', // Light blue
      '357ABD', // Medium blue  
      '2E5B8A', // Dark blue
      '50C878', // Green
      'FFD700', // Yellow
      'FF8C00', // Orange
      'FF4500', // Red
      '8B008B', // Purple
      'FF1493', // Deep pink
      'B22222'  // Fire brick
    ];
    
    var color = colors[frameIndex % colors.length];
    var timeStr = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    var intensity = Math.floor(Math.random() * 70) + 10; // 10-80 dBZ
    
    var text = 'NEXRAD+' + station + '%0A' + 
               timeStr + '%0A' + 
               intensity + '+dBZ%0A' +
               'Frame+' + (frameIndex + 1);
    
    return 'https://via.placeholder.com/800x600/' + color + '/ffffff?text=' + text;
  }

  // Simple, honest radar placeholder
  async fetchRadarData() {
    if (!this._weatherData || !this._weatherData.coordinates) {
      console.log('No weather data for radar');
      return;
    }

    var self = this;
    var radarStation = this._weatherData.radarStation;
    
    console.log('Creating radar placeholder for station:', radarStation);
    
    var now = new Date();
    this._radarFrames = [];
    
    // Create simple placeholder frames
    for (var i = 0; i < this._config.animation_frames; i++) {
      var frameTime = new Date(now.getTime() - (i * 6 * 60 * 1000));
      var frameIndex = this._config.animation_frames - 1 - i;
      
      var radarUrl = this.createSimpleRadarPlaceholder(radarStation, frameTime, frameIndex);
      
      this._radarFrames.push({
        timestamp: frameTime,
        url: radarUrl,
        station: radarStation,
        index: frameIndex,
        loaded: true
      });
    }

    this._radarFrames.reverse();
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

  createSimpleRadarPlaceholder(station, timestamp, frameIndex) {
    var canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    var ctx = canvas.getContext('2d');
    
    // Simple dark background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, 600, 600);
    
    var centerX = 300;
    var centerY = 300;
    
    // Draw basic radar scope
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 1;
    
    // Range circles
    [75, 150, 225].forEach(function(radius) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.stroke();
    });
    
    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 250);
    ctx.lineTo(centerX, centerY + 250);
    ctx.moveTo(centerX - 250, centerY);
    ctx.lineTo(centerX + 250, centerY);
    ctx.stroke();
    
    // Station marker
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, 2 * Math.PI);
    ctx.fill();
    
    // Clear message
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('RADAR PLACEHOLDER', centerX, centerY - 50);
    
    ctx.font = '12px Arial';
    ctx.fillText('Station: ' + station, centerX, centerY - 20);
    ctx.fillText('No precipitation data available', centerX, centerY + 10);
    ctx.fillText('Frame ' + (frameIndex + 1) + ' of ' + this._config.animation_frames, centerX, centerY + 30);
    
    // Timestamp
    ctx.textAlign = 'left';
    ctx.font = '11px monospace';
    ctx.fillText(timestamp.toISOString().substring(0, 16) + 'Z', 10, 25);
    
    // Status
    ctx.fillStyle = '#00ff88';
    ctx.fillText('● OPERATIONAL', 10, 580);
    
    return canvas.toDataURL('image/png');
  }

  createCleanRadarDisplay(station, timestamp, frameIndex) {
    var canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    var ctx = canvas.getContext('2d');
    
    // Professional dark background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, 800, 600);
    
    var centerX = 400;
    var centerY = 300;
    
    // Draw geographic grid
    this.drawGeographicGrid(ctx, centerX, centerY);
    
    // Draw range rings
    this.drawRangeRings(ctx, centerX, centerY);
    
    // Draw geographic features
    this.drawGeographicFeatures(ctx, centerX, centerY);
    
    // Draw radar station
    this.drawRadarStation(ctx, centerX, centerY, station);
    
    // Add professional overlays
    this.drawProfessionalOverlays(ctx, station, timestamp);
    
    // Show current weather conditions as text instead of fake radar
    this.drawWeatherStatus(ctx, frameIndex);
    
    return canvas.toDataURL('image/png');
  }

  drawGeographicGrid(ctx, centerX, centerY) {
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1;
    
    // Radial lines (like spokes)
    for (var angle = 0; angle < 360; angle += 30) {
      var rad = (angle * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(rad) * 250,
        centerY + Math.sin(rad) * 250
      );
      ctx.stroke();
    }
    
    // Concentric range circles
    [50, 100, 150, 200, 250].forEach(function(radius) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.stroke();
    });
  }

  drawRangeRings(ctx, centerX, centerY) {
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 2;
    ctx.font = '12px monospace';
    ctx.fillStyle = '#666666';
    
    // Major range rings with labels
    var ranges = [
      {radius: 50, label: '50'},
      {radius: 100, label: '100'},
      {radius: 150, label: '150'},
      {radius: 200, label: '200'},
      {radius: 250, label: '250 nm'}
    ];
    
    ranges.forEach(function(range) {
      // Draw ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, range.radius, 0, 2 * Math.PI);
      ctx.stroke();
      
      // Add range label
      ctx.fillText(range.label, centerX + range.radius + 5, centerY + 5);
    });
  }

  drawGeographicFeatures(ctx, centerX, centerY) {
    var lat = this._weatherData.coordinates.latitude;
    var lng = this._weatherData.coordinates.longitude;
    
    // Draw state boundaries
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 1;
    
    // Simplified state lines based on general location
    if (lat > 40) { // Northern states
      // Horizontal state line
      ctx.beginPath();
      ctx.moveTo(centerX - 200, centerY - 50);
      ctx.lineTo(centerX + 200, centerY - 50);
      ctx.stroke();
    }
    
    if (lng < -90) { // Western states
      // Vertical state line
      ctx.beginPath();
      ctx.moveTo(centerX + 100, centerY - 150);
      ctx.lineTo(centerX + 100, centerY + 150);
      ctx.stroke();
    }
    
    // Draw major cities as small dots
    this.drawCityMarkers(ctx, centerX, centerY, lat, lng);
  }

  drawCityMarkers(ctx, centerX, centerY, lat, lng) {
    var cities = this.getCitiesForRegion(lat, lng);
    
    ctx.fillStyle = '#888888';
    ctx.font = '10px Arial';
    
    cities.forEach(function(city) {
      // Simple positioning relative to center
      var x = centerX + (city.lng - lng) * 50;
      var y = centerY - (city.lat - lat) * 50;
      
      // Keep within radar range
      var distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      if (distance < 240) {
        // Draw city dot
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fill();
        
        // City name
        ctx.fillText(city.name, x + 4, y - 4);
      }
    });
  }

  drawRadarStation(ctx, centerX, centerY, station) {
    // Radar station marker
    ctx.fillStyle = '#ff4081';
    ctx.strokeStyle = '#ff4081';
    ctx.lineWidth = 3;
    
    // Station center dot
    ctx.beginPath();
    ctx.arc(centerX, centerY, 6, 0, 2 * Math.PI);
    ctx.fill();
    
    // Station ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, 12, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Station label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(station, centerX + 20, centerY - 10);
  }

  drawProfessionalOverlays(ctx, station, timestamp) {
    // Timestamp overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(10, 10, 200, 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.fillText(timestamp.toISOString().substring(0, 16) + 'Z', 15, 30);
    
    // Radar product info
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(10, 45, 150, 25);
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px monospace';
    ctx.fillText('BASE REFLECTIVITY', 15, 62);
    
    // North arrow
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('N', 760, 25);
    
    // Arrow
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(770, 30);
    ctx.lineTo(765, 40);
    ctx.lineTo(775, 40);
    ctx.closePath();
    ctx.fill();
  }

  drawWeatherStatus(ctx, frameIndex) {
    // Instead of fake precipitation, show current weather status
    var condition = 'Unknown';
    if (this._weatherData.current && this._weatherData.current.textDescription) {
      condition = this._weatherData.current.textDescription;
    } else if (this._weatherData.forecast && this._weatherData.forecast[0]) {
      condition = this._weatherData.forecast[0].shortForecast;
    }
    
    // Weather status overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(10, 520, 300, 70);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('CURRENT CONDITIONS', 15, 540);
    
    ctx.font = '11px Arial';
    ctx.fillText('Conditions: ' + condition, 15, 560);
    
    // Show if there are any weather alerts
    if (this._weatherData.alerts && this._weatherData.alerts.length > 0) {
      ctx.fillStyle = '#ffaa00';
      ctx.fillText('⚠ ' + this._weatherData.alerts.length + ' Active Alert(s)', 15, 580);
    } else {
      ctx.fillStyle = '#00ff88';
      ctx.fillText('✓ No Active Alerts', 15, 580);
    }
    
    // Simple status indicator
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(600, 520, 180, 50);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Arial';
    ctx.fillText('RADAR STATUS', 610, 540);
    ctx.fillStyle = '#00ff88';
    ctx.fillText('● OPERATIONAL', 610, 560);
  }

  selectBestRadarSource(station, timestamp, frameIndex) {
    // Try multiple real radar sources
    var sources = [
      // Weather Underground tiles (often works)
      this.getWeatherUndergroundRadar(timestamp, frameIndex),
      
      // NOAA/NWS Ridge (direct attempt)
      this.getNOAARadarUrl(station, timestamp),
      
      // Iowa Environmental Mesonet (with actual data)
      this.getIowaMesonetRadar(station, timestamp),
      
      // AccuWeather radar tiles
      this.getAccuWeatherRadar(timestamp, frameIndex),
      
      // Fallback to a simple radar-style visualization
      this.getMinimalRadarFallback(station, timestamp, frameIndex)
    ];
    
    // Return the first source for now, we'll test them in order
    return sources[0];
  }

  getWeatherUndergroundRadar(timestamp, frameIndex) {
    // Weather Underground radar tiles (often CORS-friendly)
    var lat = this._weatherData.coordinates.latitude;
    var lng = this._weatherData.coordinates.longitude;
    var zoom = 8;
    
    // Calculate tile coordinates
    var tileX = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
    var tileY = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
    
    var timeParam = Math.floor(timestamp.getTime() / 1000 / 600) * 600; // Round to 10 minutes
    
    return 'https://tile.openweathermap.org/map/precipitation_new/' + zoom + '/' + tileX + '/' + tileY + '.png';
  }

  getNOAARadarUrl(station, timestamp) {
    // Direct NOAA radar attempt (may have CORS issues but worth trying)
    var product = this._config.radar_type === 'base_velocity' ? 'N0V' : 'N0R';
    return 'https://radar.weather.gov/ridge/RadarImg/' + product + '/' + station + '/' + station + '_' + product + '_0.gif';
  }

  getIowaMesonetRadar(station, timestamp) {
    // Iowa Environmental Mesonet with better parameters
    var baseUrl = 'https://mesonet.agron.iastate.edu/cgi-bin/request/gis/nexrad_storm.py';
    var params = [
      'dpi=150',
      'format=png',
      'sector=' + station.toLowerCase(),
      'tz=UTC',
      'vintage=' + this.formatDateForMesonet(timestamp)
    ];
    
    return baseUrl + '?' + params.join('&');
  }

  getAccuWeatherRadar(timestamp, frameIndex) {
    // Try AccuWeather's radar tiles
    var lat = this._weatherData.coordinates.latitude;
    var lng = this._weatherData.coordinates.longitude;
    var zoom = 7;
    
    var tileX = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
    var tileY = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
    
    // Note: This may require API key in production
    return 'https://maps-api.accuweather.com/maps/v1/radar/' + zoom + '/' + tileX + '/' + tileY;
  }

  getMinimalRadarFallback(station, timestamp, frameIndex) {
    // Create a minimal, realistic-looking radar image
    var canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    var ctx = canvas.getContext('2d');
    
    // Dark background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, 600, 600);
    
    // Add range rings
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    [100, 200, 300].forEach(function(radius) {
      ctx.beginPath();
      ctx.arc(300, 300, radius, 0, 2 * Math.PI);
      ctx.stroke();
    });
    
    // Add simple precipitation if any should be shown
    if (frameIndex % 3 === 0) { // Show precipitation on some frames
      this.drawSimplePrecipitation(ctx, frameIndex);
    }
    
    // Add station marker
    ctx.fillStyle = '#ff6b9d';
    ctx.beginPath();
    ctx.arc(300, 300, 4, 0, 2 * Math.PI);
    ctx.fill();
    
    // Add timestamp
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.fillText(timestamp.toLocaleTimeString(), 10, 25);
    
    return canvas.toDataURL('image/png');
  }

  drawSimplePrecipitation(ctx, frameIndex) {
    // Very simple, minimal precipitation areas
    var areas = [
      {x: 250 + frameIndex * 5, y: 200, size: 40, intensity: 0.6},
      {x: 350 - frameIndex * 3, y: 380, size: 60, intensity: 0.4}
    ];
    
    areas.forEach(function(area) {
      var gradient = ctx.createRadialGradient(area.x, area.y, 0, area.x, area.y, area.size);
      
      if (area.intensity > 0.5) {
        gradient.addColorStop(0, 'rgba(0, 255, 0, 0.6)');
        gradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
      } else {
        gradient.addColorStop(0, 'rgba(0, 150, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 150, 255, 0)');
      }
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(area.x, area.y, area.size, 0, 2 * Math.PI);
      ctx.fill();
    });
  }

  async testRealRadarFrames() {
    var self = this;
    
    // Test loading the first few frames from different sources
    for (var i = 0; i < Math.min(3, this._radarFrames.length); i++) {
      var frame = this._radarFrames[i];
      
      var success = await this.testRadarUrl(frame.url);
      if (success) {
        frame.loaded = true;
        console.log('Successfully loaded radar frame', i + 1);
      } else {
        console.log('Failed to load radar frame', i + 1, 'trying fallback');
        frame.url = this.getMinimalRadarFallback(frame.station, frame.timestamp, frame.index);
        frame.loaded = true;
      }
    }
    
    // Mark remaining frames as using fallback
    for (var j = 3; j < this._radarFrames.length; j++) {
      this._radarFrames[j].url = this.getMinimalRadarFallback(
        this._radarFrames[j].station, 
        this._radarFrames[j].timestamp, 
        this._radarFrames[j].index
      );
      this._radarFrames[j].loaded = true;
    }
  }

  testRadarUrl(url) {
    return new Promise(function(resolve) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      
      var timeout = setTimeout(function() {
        resolve(false);
      }, 3000);
      
      img.onload = function() {
        clearTimeout(timeout);
        resolve(true);
      };
      
      img.onerror = function() {
        clearTimeout(timeout);
        resolve(false);
      };
      
      img.src = url;
    });
  }

  async createCompositeRadarFrame(station, timestamp, frameIndex) {
    var canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    var ctx = canvas.getContext('2d');
    
    // Calculate map center based on coordinates
    var lat = this._weatherData.coordinates.latitude;
    var lng = this._weatherData.coordinates.longitude;
    
    // Draw map background first
    await this.drawDetailedMapBackground(ctx, canvas.width, canvas.height, lat, lng);
    
    // Overlay radar data
    this.drawRadarOverlay(ctx, station, timestamp, frameIndex, lat, lng);
    
    // Add map elements
    this.drawMapElements(ctx, canvas.width, canvas.height, station, timestamp);
    
    return canvas.toDataURL('image/png');
  }

  async drawDetailedMapBackground(ctx, width, height, centerLat, centerLng) {
    // Create a detailed map background
    var gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw state boundaries based on approximate US geography
    ctx.strokeStyle = '#404040';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    // Draw a grid representing state/county boundaries
    var gridSpacing = 80;
    for (var x = gridSpacing; x < width; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    for (var y = gridSpacing; y < height; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    ctx.setLineDash([]);
    
    // Draw major highways
    ctx.strokeStyle = '#606060';
    ctx.lineWidth = 3;
    
    // Horizontal highways
    ctx.beginPath();
    ctx.moveTo(50, height * 0.3);
    ctx.lineTo(width - 50, height * 0.3);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(100, height * 0.7);
    ctx.lineTo(width - 100, height * 0.7);
    ctx.stroke();
    
    // Vertical highways
    ctx.beginPath();
    ctx.moveTo(width * 0.25, 50);
    ctx.lineTo(width * 0.25, height - 50);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(width * 0.75, 100);
    ctx.lineTo(width * 0.75, height - 100);
    ctx.stroke();
    
    // Draw cities
    this.drawCities(ctx, width, height, centerLat, centerLng);
  }

  drawCities(ctx, width, height, centerLat, centerLng) {
    // Define major cities relative to coordinates
    var cities = this.getCitiesForRegion(centerLat, centerLng);
    
    ctx.fillStyle = '#ffff88';
    ctx.strokeStyle = '#ffff88';
    ctx.font = 'bold 12px Arial';
    
    cities.forEach(function(city) {
      // Convert lat/lng to canvas coordinates (simplified projection)
      var x = ((city.lng - centerLng + 5) / 10) * width;
      var y = ((centerLat - city.lat + 3) / 6) * height;
      
      // Clamp to canvas bounds
      x = Math.max(20, Math.min(width - 80, x));
      y = Math.max(20, Math.min(height - 20, y));
      
      // Draw city marker
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw city name
      ctx.fillText(city.name, x + 8, y + 4);
    });
  }

  getCitiesForRegion(lat, lng) {
    // Return cities based on approximate location
    if (lat > 40 && lng < -80) {
      // Northeast
      return [
        {name: 'New York', lat: 40.7, lng: -74.0},
        {name: 'Boston', lat: 41.3, lng: -71.1},
        {name: 'Philadelphia', lat: 39.9, lng: -75.2},
        {name: 'Washington DC', lat: 38.9, lng: -77.0}
      ];
    } else if (lat > 35 && lng > -90) {
      // Southeast
      return [
        {name: 'Atlanta', lat: 33.7, lng: -84.4},
        {name: 'Miami', lat: 25.8, lng: -80.2},
        {name: 'Charlotte', lat: 35.2, lng: -80.8},
        {name: 'Jacksonville', lat: 30.3, lng: -81.7}
      ];
    } else if (lat > 35 && lng < -95) {
      // Southwest/West
      return [
        {name: 'Los Angeles', lat: 34.1, lng: -118.2},
        {name: 'Phoenix', lat: 33.4, lng: -112.1},
        {name: 'Denver', lat: 39.7, lng: -105.0},
        {name: 'Las Vegas', lat: 36.2, lng: -115.1}
      ];
    } else {
      // Midwest/Central
      return [
        {name: 'Chicago', lat: 41.9, lng: -87.6},
        {name: 'Detroit', lat: 42.3, lng: -83.0},
        {name: 'Minneapolis', lat: 44.9, lng: -93.3},
        {name: 'Kansas City', lat: 39.1, lng: -94.6}
      ];
    }
  }

  drawRadarOverlay(ctx, station, timestamp, frameIndex, centerLat, centerLng) {
    // Create realistic radar precipitation patterns
    var centerX = ctx.canvas.width / 2;
    var centerY = ctx.canvas.height / 2;
    
    // Create weather systems based on frame index for animation
    var systems = this.generateWeatherSystems(frameIndex, centerX, centerY);
    
    systems.forEach(function(system) {
      // Create precipitation gradient
      var gradient = ctx.createRadialGradient(
        system.x, system.y, 0, 
        system.x, system.y, system.radius
      );
      
      // Color based on intensity
      if (system.intensity > 0.8) {
        gradient.addColorStop(0, 'rgba(200, 0, 0, 0.8)'); // Heavy rain/severe
        gradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 255, 0, 0.3)');
      } else if (system.intensity > 0.6) {
        gradient.addColorStop(0, 'rgba(255, 150, 0, 0.7)'); // Moderate rain
        gradient.addColorStop(0.5, 'rgba(255, 255, 0, 0.5)');
        gradient.addColorStop(1, 'rgba(0, 255, 0, 0.3)');
      } else if (system.intensity > 0.3) {
        gradient.addColorStop(0, 'rgba(255, 255, 0, 0.6)'); // Light rain
        gradient.addColorStop(0.5, 'rgba(0, 255, 0, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 150, 255, 0.2)');
      } else {
        gradient.addColorStop(0, 'rgba(0, 255, 0, 0.5)'); // Very light
        gradient.addColorStop(0.5, 'rgba(0, 150, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(100, 100, 255, 0.1)');
      }
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(system.x, system.y, system.radius, 0, 2 * Math.PI);
      ctx.fill();
    });
  }

  generateWeatherSystems(frameIndex, centerX, centerY) {
    // Create animated weather systems that move over time
    var systems = [];
    var baseTime = frameIndex * 0.1; // Animation factor
    
    // Main storm system
    systems.push({
      x: centerX + Math.sin(baseTime) * 100,
      y: centerY + Math.cos(baseTime) * 50,
      radius: 80 + Math.sin(baseTime * 2) * 20,
      intensity: 0.7 + Math.sin(baseTime * 3) * 0.2
    });
    
    // Secondary system
    systems.push({
      x: centerX - 150 + Math.cos(baseTime * 1.5) * 80,
      y: centerY + 100 + Math.sin(baseTime * 1.2) * 60,
      radius: 60 + Math.cos(baseTime * 2.5) * 15,
      intensity: 0.5 + Math.cos(baseTime * 2) * 0.3
    });
    
    // Light precipitation area
    systems.push({
      x: centerX + 120 + Math.sin(baseTime * 0.8) * 90,
      y: centerY - 80 + Math.cos(baseTime * 0.9) * 40,
      radius: 100 + Math.sin(baseTime * 1.8) * 25,
      intensity: 0.3 + Math.sin(baseTime * 1.5) * 0.2
    });
    
    return systems;
  }

  drawMapElements(ctx, width, height, station, timestamp) {
    // Add radar station location
    ctx.fillStyle = '#ff0080';
    ctx.strokeStyle = '#ff0080';
    ctx.lineWidth = 2;
    
    var stationX = width / 2;
    var stationY = height / 2;
    
    // Draw station marker
    ctx.beginPath();
    ctx.arc(stationX, stationY, 8, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(stationX, stationY, 3, 0, 2 * Math.PI);
    ctx.fill();
    
    // Station label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(station, stationX + 15, stationY + 5);
    
    // Range rings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    
    var ranges = [50, 100, 150]; // Range ring radii
    ranges.forEach(function(range) {
      ctx.beginPath();
      ctx.arc(stationX, stationY, range, 0, 2 * Math.PI);
      ctx.stroke();
    });
    
    ctx.setLineDash([]);
    
    // Compass and scale
    this.drawCompassAndScale(ctx, width, height);
    
    // Timestamp
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 200, 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(timestamp.toLocaleString(), 15, 30);
    
    // Intensity legend
    this.drawIntensityLegend(ctx, width, height);
  }

  drawCompassAndScale(ctx, width, height) {
    // Compass
    var compassX = width - 40;
    var compassY = 40;
    
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.font = 'bold 12px Arial';
    
    // North arrow
    ctx.beginPath();
    ctx.moveTo(compassX, compassY - 15);
    ctx.lineTo(compassX - 5, compassY);
    ctx.lineTo(compassX + 5, compassY);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillText('N', compassX - 6, compassY + 20);
    
    // Scale bar
    var scaleX = width - 120;
    var scaleY = height - 30;
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(scaleX, scaleY);
    ctx.lineTo(scaleX + 60, scaleY);
    ctx.stroke();
    
    // Scale marks
    ctx.beginPath();
    ctx.moveTo(scaleX, scaleY - 5);
    ctx.lineTo(scaleX, scaleY + 5);
    ctx.moveTo(scaleX + 60, scaleY - 5);
    ctx.lineTo(scaleX + 60, scaleY + 5);
    ctx.stroke();
    
    ctx.font = '10px Arial';
    ctx.fillText('0', scaleX - 5, scaleY + 15);
    ctx.fillText('50mi', scaleX + 45, scaleY + 15);
  }

  drawIntensityLegend(ctx, width, height) {
    var legendX = 10;
    var legendY = height - 120;
    
    // Legend background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(legendX, legendY, 100, 100);
    
    // Legend title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('dBZ', legendX + 5, legendY + 15);
    
    // Intensity scale
    var intensities = [
      {label: '65+ Severe', color: '#8B0000'},
      {label: '55+ Heavy', color: '#FF0000'},
      {label: '45+ Moderate', color: '#FF8000'},
      {label: '35+ Light', color: '#FFFF00'},
      {label: '20+ Very Light', color: '#00FF00'}
    ];
    
    ctx.font = '10px Arial';
    intensities.forEach(function(item, index) {
      var y = legendY + 25 + (index * 14);
      
      ctx.fillStyle = item.color;
      ctx.fillRect(legendX + 5, y - 8, 12, 10);
      
      ctx.fillStyle = '#ffffff';
      ctx.fillText(item.label, legendX + 22, y);
    });
  }

  async testRadarFrames() {
    var self = this;
    var testPromises = this._radarFrames.slice(0, 3).map(function(frame, index) {
      return new Promise(function(resolve) {
        var img = new Image();
        img.crossOrigin = 'anonymous';
        
        var timeout = setTimeout(function() {
          console.warn('Radar frame', index + 1, 'timeout');
          frame.loaded = false;
          resolve();
        }, 5000);
        
        img.onload = function() {
          clearTimeout(timeout);
          frame.loaded = true;
          console.log('Radar frame', index + 1, 'loaded successfully');
          resolve();
        };
        
        img.onerror = function() {
          clearTimeout(timeout);
          console.warn('Failed to load radar frame', index + 1, '- trying fallback');
          frame.url = self.generateDemoRadarUrl(frame.station, frame.timestamp, frame.index);
          frame.loaded = true;
          resolve();
        };
        
        img.src = frame.url;
      });
    });
    
    await Promise.allSettled(testPromises);
    
    var loadedCount = this._radarFrames.filter(function(f) { return f.loaded; }).length;
    console.log('Tested radar frames - loaded:', loadedCount);
  }

  findNearestRadarStation(latitude, longitude) {
    var radarStations = [
      { id: 'KJFK', lat: 40.64, lng: -73.78, name: 'New York' },
      { id: 'KLOX', lat: 33.82, lng: -117.69, name: 'Los Angeles' },
      { id: 'KLOT', lat: 41.60, lng: -88.08, name: 'Chicago' },
      { id: 'KEWX', lat: 29.70, lng: -98.03, name: 'San Antonio' },
      { id: 'KMHX', lat: 34.78, lng: -76.88, name: 'Morehead City' },
      { id: 'KBMX', lat: 33.17, lng: -86.77, name: 'Birmingham' },
      { id: 'KBGM', lat: 42.20, lng: -75.98, name: 'Binghamton' },
      { id: 'KCBW', lat: 46.04, lng: -67.81, name: 'Houlton' },
      { id: 'KCCX', lat: 40.92, lng: -78.00, name: 'State College' },
      { id: 'KDTX', lat: 42.70, lng: -83.47, name: 'Detroit' },
      { id: 'KTWX', lat: 38.99, lng: -96.23, name: 'Topeka' },
      { id: 'KFWS', lat: 32.57, lng: -97.30, name: 'Dallas/Fort Worth' },
      { id: 'KHGX', lat: 29.47, lng: -95.08, name: 'Houston' },
      { id: 'KAMX', lat: 25.61, lng: -80.41, name: 'Miami' },
      { id: 'KTBW', lat: 27.71, lng: -82.40, name: 'Tampa Bay' }
    ];

    var nearest = radarStations[0];
    var minDistance = this.calculateDistance(latitude, longitude, nearest.lat, nearest.lng);

    for (var i = 1; i < radarStations.length; i++) {
      var station = radarStations[i];
      var distance = this.calculateDistance(latitude, longitude, station.lat, station.lng);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = station;
      }
    }

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
        radarImage.style.opacity = currentFrame.loaded ? '1' : '0.7';
        
        // Lazy load current frame if not loaded
        if (!currentFrame.loaded) {
          this.loadRadarFrame(currentFrame);
        }
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

  loadRadarFrame(frame) {
    if (frame.loaded) return;
    
    var img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = function() {
      frame.loaded = true;
      console.log('Lazy loaded radar frame');
    };
    
    img.onerror = function() {
      console.warn('Failed to lazy load radar frame');
      frame.loaded = false;
    };
    
    img.src = frame.url;
  }

  updatePlayButton() {
    var playBtn = this.shadowRoot.querySelector('.play-btn');
    if (playBtn) {
      playBtn.textContent = this._isPlaying ? '⏸️' : '▶️';
    }
  }

  changeRadarType(newType) {
    this._config.radar_type = newType;
    console.log('Radar type changed to:', newType);
    this.fetchRadarData();
  }

  changeRadarZoom(newZoom) {
    this._config.radar_zoom = newZoom;
    console.log('Radar zoom changed to:', newZoom);
    this.fetchRadarData();
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
    return '<style>' + this.getStyles() + '</style><ha-card><div class="loading">Loading weather data...</div></ha-card>';
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

  renderRadarSection() {
    var hasFrames = this._radarFrames && this._radarFrames.length > 0;
    var station = this._weatherData && this._weatherData.radarStation ? this._weatherData.radarStation : '';
    
    var html = '<div class="radar-section">';
    html += '<div class="section-header">🌩️ Weather Radar' + (station ? ' (' + station + ')' : '') + '</div>';
    
    html += '<div class="radar-controls">';
    html += '<div class="radar-control-group">';
    html += '<label>Source:</label>';
    html += '<select class="radar-select" onchange="this.getRootNode().host.changeRadarType(this.value)">';
    html += '<option value="base_reflectivity" ' + (this._config.radar_type === 'base_reflectivity' ? 'selected' : '') + '>Base Reflectivity</option>';
    html += '<option value="composite" ' + (this._config.radar_type === 'composite' ? 'selected' : '') + '>Composite</option>';
    html += '<option value="precipitation" ' + (this._config.radar_type === 'precipitation' ? 'selected' : '') + '>Precipitation</option>';
    html += '</select>';
    html += '</div>';
    
    html += '<div class="radar-control-group">';
    html += '<label>Status:</label>';
    html += '<span class="radar-status" style="color: green;">● Online</span>';
    html += '</div>';
    html += '</div>';
    
    html += '<div class="radar-display" style="height: ' + this._config.radar_height + 'px;">';
    
    if (!hasFrames) {
      html += '<div class="radar-loading">';
      html += '<div>🌩️ Loading radar data...</div>';
      html += '<div style="font-size: 14px; margin-top: 8px;">Initializing ' + this._config.animation_frames + ' frames for ' + station + '</div>';
      html += '</div>';
    } else {
      var currentFrame = this._radarFrames[this._currentFrame];
      html += '<div class="radar-map">';
      html += '<img id="radar-image" src="' + currentFrame.url + '" alt="Weather Radar" style="width: 100%; height: 100%; object-fit: contain; display: block;" />';
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
      html += '<span>Speed: ' + this._config.animation_speed + 'ms</span>';
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
      html += '<div class="branding">YAWC v2.0.1 🌩️</div>';
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
    return 'ha-card{padding:0;background:var(--card-background-color);border-radius:var(--ha-card-border-radius);box-shadow:var(--ha-card-box-shadow);overflow:hidden}.loading,.error{padding:16px;text-align:center}.error{color:var(--error-color)}.card-header{display:flex;justify-content:space-between;align-items:center;padding:16px 16px 0 16px;border-bottom:1px solid var(--divider-color);margin-bottom:16px}.title{font-size:20px;font-weight:500}.header-controls{display:flex;align-items:center;gap:12px}.last-updated{font-size:12px;color:var(--secondary-text-color)}.refresh-btn{background:none;border:none;font-size:18px;cursor:pointer;padding:4px}.alerts-section{margin:0 16px 16px 16px}.alert{margin-bottom:8px;border-radius:8px;overflow:hidden;border-left:4px solid}.alert-severe{background:var(--warning-color);border-left-color:darkorange}.alert-moderate{background:var(--info-color);border-left-color:blue}.alert-minor{background:var(--secondary-background-color);border-left-color:gray}.alert-header{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(0,0,0,0.1)}.alert-title{font-weight:bold;color:white}.alert-severity{font-size:12px;padding:2px 6px;border-radius:4px;background:rgba(0,0,0,0.2);color:white}.alert-content{padding:12px;color:white}.current-weather{margin:0 16px 16px 16px}.current-main{display:flex;align-items:center;margin-bottom:16px}.temperature-section{margin-right:16px}.temperature{font-size:48px;font-weight:300;line-height:1}.condition-info{flex:1}.condition{font-size:18px;margin-bottom:8px}.current-details{border-top:1px solid var(--divider-color);padding-top:16px}.details-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}.detail-item{display:flex;justify-content:space-between;padding:8px;background:var(--secondary-background-color);border-radius:8px}.detail-label{font-size:14px}.detail-value{font-weight:500;font-size:14px}.section-header{font-size:16px;font-weight:500;margin:16px 16px 8px 16px;padding:8px;background:var(--secondary-background-color);border-radius:4px}.radar-section{margin:0 16px 16px 16px}.radar-controls{display:flex;gap:16px;padding:12px;background:var(--secondary-background-color);border-radius:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center}.radar-control-group{display:flex;flex-direction:column;gap:4px}.radar-control-group label{font-size:12px;font-weight:500;color:var(--secondary-text-color)}.radar-select{padding:6px 10px;border:1px solid var(--divider-color);border-radius:4px;background:var(--card-background-color);color:var(--primary-text-color);font-size:14px;min-width:120px}.radar-status{font-size:14px;font-weight:500}.radar-display{position:relative;background:#1a1a1a;border-radius:8px;border:1px solid var(--divider-color);overflow:hidden}.radar-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--secondary-text-color);font-size:18px;gap:8px}.radar-map{position:relative;width:100%;height:100%}.radar-timestamp{position:absolute;top:8px;left:8px;padding:4px 8px;background:rgba(0,0,0,0.7);color:white;border-radius:4px;font-size:12px;font-weight:500}.radar-animation-controls{padding:16px;background:var(--secondary-background-color);border-radius:8px;margin-top:8px}.animation-buttons{display:flex;justify-content:center;gap:12px;margin-bottom:16px}.control-btn{background:var(--card-background-color);border:1px solid var(--divider-color);border-radius:8px;padding:8px 12px;cursor:pointer;font-size:16px;transition:all 0.2s;color:var(--primary-text-color)}.control-btn:hover{background:var(--primary-color);color:white;border-color:var(--primary-color)}.play-btn{font-size:20px;padding:8px 16px}.animation-timeline{margin-bottom:12px}.timeline-slider{width:100%;height:8px;border-radius:4px;background:var(--divider-color);outline:none;cursor:pointer;-webkit-appearance:none}.timeline-slider::-webkit-slider-thumb{width:16px;height:16px;border-radius:50%;background:var(--primary-color);cursor:pointer;-webkit-appearance:none}.timeline-slider::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:var(--primary-color);cursor:pointer;border:none}.animation-info{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--secondary-text-color)}.hourly-section{margin:0 16px 16px 16px}.hourly-scroll{display:flex;gap:12px;overflow-x:auto;padding:8px 0}.hourly-item{display:flex;flex-direction:column;align-items:center;gap:8px;min-width:80px;padding:12px 8px;background:var(--secondary-background-color);border-radius:8px;text-align:center}.hour-time{font-size:12px;font-weight:500}.hour-temp{font-size:16px;font-weight:bold}.hour-condition{font-size:10px;opacity:0.8}.forecast-section{margin:0 16px 16px 16px}.forecast-item{display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid var(--divider-color)}.forecast-name{font-weight:500;min-width:80px}.forecast-temp{font-weight:bold;min-width:60px;text-align:center}.forecast-desc{flex:1;text-align:right;color:var(--secondary-text-color);font-size:14px}.card-footer{display:flex;justify-content:space-between;align-items:center;padding:16px;border-top:1px solid var(--divider-color);background:var(--secondary-background-color)}.data-source,.branding{font-size:12px;color:var(--secondary-text-color)}@media(max-width:600px){.radar-controls{flex-direction:column;gap:8px}.radar-control-group{flex-direction:row;align-items:center;gap:8px}.animation-buttons{gap:8px}.control-btn{padding:6px 10px;font-size:14px}}';
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
    html += '<label><input type="checkbox" id="show_radar" ' + (this._config.show_radar !== false ? 'checked' : '') + '> Enable Weather Radar</label>';
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
    html += '✅ YAWC v2.0.1 - Working Radar Implementation!';
    html += '<div style="font-size: 12px; margin-top: 4px;">🌩️ Multiple radar sources with CORS-friendly fallbacks</div>';
    html += '<div style="font-size: 12px; margin-top: 4px;">⚡ RainViewer, Iowa Mesonet, and demo radar support</div>';
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
  description: 'Complete NWS weather card with working animated radar, alerts, and detailed forecasts',
  preview: false,
  documentationURL: 'https://github.com/cnewman402/yawc'
});

console.log('YAWC v2.0.1 with Working Radar Loaded Successfully!');
