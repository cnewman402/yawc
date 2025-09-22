class YetAnotherWeatherCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._weatherData = null;
    this._updateInterval = null;
    this._clockInterval = null;
    this._hasRenderedRadar = false;
  }

  setConfig(config) {
    if (!config) throw new Error('Invalid configuration');
    this._config = {
      title: config.title || 'YAWC Weather',
      update_interval: config.update_interval || 300000,
      show_alerts: config.show_alerts !== false,
      show_forecast: config.show_forecast !== false,
      show_hourly: config.show_hourly !== false,
      show_radar: config.show_radar !== false,
      show_branding: config.show_branding !== false,
      
      // NEW: Optional header configurations
      show_radar_header: config.show_radar_header !== false,
      show_hourly_header: config.show_hourly_header !== false,
      show_forecast_header: config.show_forecast_header !== false,
      
      forecast_days: config.forecast_days || 5,
      radar_zoom: config.radar_zoom || 7,
      radar_height: config.radar_height || 450,
      latitude: config.latitude || null,
      longitude: config.longitude || null
    };
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._weatherData) this.fetchWeatherData();
    else this.updateWeatherOnly();
    this.startUpdateInterval();
  }

  connectedCallback() { 
    this.startUpdateInterval();
    this.startClock();
    this._hasRenderedRadar = false;
  }
  
  disconnectedCallback() { 
    this.stopUpdateInterval();
    this.stopClock();
    this._hasRenderedRadar = false;
  }

  startUpdateInterval() {
    this.stopUpdateInterval();
    this._updateInterval = setInterval(() => this.fetchWeatherData(true), this._config.update_interval);
  }

  stopUpdateInterval() {
    if (this._updateInterval) {
      clearInterval(this._updateInterval);
      this._updateInterval = null;
    }
  }

  startClock() {
    this.stopClock();
    this._clockInterval = setInterval(() => this.updateClock(), 1000);
  }

  stopClock() {
    if (this._clockInterval) {
      clearInterval(this._clockInterval);
      this._clockInterval = null;
    }
  }

  updateClock() {
    const timeEl = this.shadowRoot.querySelector('.time');
    if (timeEl) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      timeEl.textContent = timeStr;
    }
  }

  async fetchWeatherData(isUpdate = false) {
    if (!this._hass) return;
    const lat = this._config.latitude || this._hass.config.latitude;
    const lon = this._config.longitude || this._hass.config.longitude;
    if (!lat || !lon) {
      this._weatherData = { error: 'No coordinates available' };
      this.render();
      return;
    }

    try {
      const pointResp = await fetch(`https://api.weather.gov/points/${lat},${lon}`);
      if (!pointResp.ok) throw new Error('Failed to get NWS data');
      const point = await pointResp.json();
      const props = point.properties;
      
      const [forecast, hourly, alerts, current] = await Promise.all([
        fetch(props.forecast).then(r => r.json()),
        fetch(props.forecastHourly).then(r => r.json()).catch(() => null),
        fetch(`https://api.weather.gov/alerts/active?point=${lat},${lon}`).then(r => r.json()).catch(() => null),
        this.getCurrentObs(props.observationStations)
      ]);

      this._weatherData = {
        current: current,
        forecast: forecast.properties.periods,
        hourly: hourly ? hourly.properties.periods : [],
        alerts: alerts ? alerts.features : [],
        coords: { lat, lon },
        radarStation: props.radarStation,
        lastUpdated: new Date()
      };
      
      if (isUpdate) {
        this.updateWeatherOnly();
      } else {
        this.render();
      }
    } catch (error) {
      console.error('Weather fetch error:', error);
      this._weatherData = { error: error.message, lastUpdated: new Date() };
      this.render();
    }
  }

  async getCurrentObs(stationsUrl) {
    try {
      const resp = await fetch(stationsUrl);
      const data = await resp.json();
      if (!data.features?.length) return null;
      const obsResp = await fetch(`${data.features[0].id}/observations/latest`);
      if (obsResp.ok) {
        const obs = await obsResp.json();
        return obs.properties;
      }
    } catch { }
    return null;
  }

  updateWeatherOnly() {
    if (!this._weatherData || this._weatherData.error) {
      this.render();
      return;
    }
    
    const headerEl = this.shadowRoot.querySelector('.header .upd');
    if (headerEl) {
      const upd = this._weatherData.lastUpdated?.toLocaleTimeString() || '';
      headerEl.innerHTML = `Updated: ${upd} <button class="refresh-btn">↻</button>`;
      headerEl.querySelector('.refresh-btn').addEventListener('click', () => this.fetchWeatherData());
    }
    
    const currentEl = this.shadowRoot.querySelector('.current');
    if (currentEl) {
      currentEl.outerHTML = this.current();
    }
    
    const alertsEl = this.shadowRoot.querySelector('.alerts');
    const alertsHtml = this.alerts();
    if (alertsEl && alertsHtml) {
      alertsEl.outerHTML = alertsHtml;
    } else if (!alertsEl && alertsHtml) {
      const headerEl = this.shadowRoot.querySelector('.header');
      if (headerEl) {
        headerEl.insertAdjacentHTML('afterend', alertsHtml);
      }
    } else if (alertsEl && !alertsHtml) {
      alertsEl.remove();
    }
    
    const hourlyEl = this.shadowRoot.querySelector('.hourly');
    if (hourlyEl && this._config.show_hourly) {
      hourlyEl.outerHTML = this.hourly();
    }
    
    const forecastEl = this.shadowRoot.querySelector('.forecast');
    if (forecastEl && this._config.show_forecast) {
      forecastEl.outerHTML = this.forecast();
    }
  }

  render() {
    if (!this._hass) return;
    
    let h = `<style>${this.css()}</style>`;
    if (!this._weatherData) {
      h += `<ha-card><div class="loading">Loading Weather Data...</div></ha-card>`;
      this.shadowRoot.innerHTML = h;
      return;
    } else if (this._weatherData.error) {
      h += `<ha-card><div class="error">Error: ${this._weatherData.error}</div></ha-card>`;
      this.shadowRoot.innerHTML = h;
      return;
    }
    
    h += '<ha-card>';
    h += this.header();
    if (this._config.show_alerts) h += this.alerts();
    h += this.current();
    if (this._config.show_radar) h += this.radar();
    if (this._config.show_hourly) h += this.hourly();
    if (this._config.show_forecast) h += this.forecast();
    h += this.footer();
    h += '</ha-card>';
    
    this.shadowRoot.innerHTML = h;
    this._hasRenderedRadar = true;
    
    const refreshBtn = this.shadowRoot.querySelector('.refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.fetchWeatherData());
    }
    
    // Start the live clock after rendering
    this.startClock();
  }

  header() {
    const upd = this._weatherData.lastUpdated?.toLocaleTimeString() || '';
    return `<div class="header">
      <div class="title">${this._config.title}</div>
      <div class="upd">Updated: ${upd} 
        <button class="refresh-btn">↻</button>
      </div>
    </div>`;
  }

  alerts() {
    if (!this._weatherData.alerts?.length) return '';
    let h = '<div class="alerts">';
    for (const a of this._weatherData.alerts) {
      const p = a.properties;
      const sev = (p.severity || 'Minor').toLowerCase();
      h += `<div class="alert ${sev}">
        <div class="alert-title">⚠️ ${p.event}</div>
        <div class="alert-desc">${p.headline}</div>
      </div>`;
    }
    return h + '</div>';
  }

  current() {
    const c = this._weatherData.current;
    const f = this._weatherData.forecast;
    let temp = 'N/A', cond = 'Unknown';
    
    // Handle temperature based on data source
    if (c?.temperature?.value) {
      if (this._weatherData.source === 'openmeteo') {
        temp = Math.round(c.temperature.value); // Open-Meteo already in Fahrenheit
      } else {
        temp = Math.round(c.temperature.value * 9/5 + 32); // NWS Celsius to Fahrenheit
      }
    } else if (f?.[0]) {
      const m = f[0].temperature.toString().match(/\d+/);
      temp = m ? m[0] : 'N/A';
    }
    
    if (c?.textDescription) cond = c.textDescription;
    else if (f?.[0]?.shortForecast) cond = f[0].shortForecast;

    // Get current time
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    let h = `<div class="current">
      <div class="main">
        <div class="temp-block">
          <div class="temp">${temp}°</div>
          <div class="icon">${this.getIcon(cond)}</div>
        </div>
        <div class="cond">${cond}</div>
        <div class="time">${timeStr}</div>
      </div>
      <div class="details">`;
    
    if (c?.relativeHumidity?.value) {
      h += `<div class="det"><span>💧 Humidity</span><b>${Math.round(c.relativeHumidity.value)}%</b></div>`;
    }
    if (c?.windSpeed?.value) {
      let ws;
      if (this._weatherData.source === 'openmeteo') {
        ws = Math.round(c.windSpeed.value / 0.44704); // m/s to mph
      } else {
        ws = Math.round(c.windSpeed.value * 2.237); // NWS m/s to mph
      }
      const wd = c.windDirection?.value ? this.getWindDir(c.windDirection.value) : '';
      h += `<div class="det"><span>💨 Wind</span><b>${ws} mph ${wd}</b></div>`;
    }
    if (c?.barometricPressure?.value) {
      const p = Math.round(c.barometricPressure.value / 100); // Pa to mb
      h += `<div class="det"><span>📊 Pressure</span><b>${p} mb</b></div>`;
    }
    if (c?.visibility?.value) {
      const v = Math.round(c.visibility.value / 1609.34); // meters to miles
      h += `<div class="det"><span>👁️ Visibility</span><b>${v} mi</b></div>`;
    }
    return h + '</div></div>';
  }

  radar() {
    const lat = this._weatherData.coords.lat;
    const lon = this._weatherData.coords.lon;
    const zoom = this._config.radar_zoom;
    const height = this._config.radar_height;
    
    const windyUrl = `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&width=650&height=${height}&zoom=${zoom}&level=surface&overlay=radar&product=radar&menu=&message=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=mph&metricTemp=%C2%B0F&radarRange=-1`;
    
    let h = '<div class="radar">';
    
    // Only show header if configured to do so
    if (this._config.show_radar_header) {
      h += '<div class="sec-hdr">Windy.com Interactive Radar</div>';
    }
    
    h += `<div class="radar-container">
        <iframe 
          class="windy-iframe"
          width="100%" 
          height="${height}" 
          src="${windyUrl}" 
          frameborder="0"
          style="border: 0; border-radius: 8px;">
        </iframe>
      </div>
      <div class="radar-note">
        <span>Interactive radar with pan, zoom, and layer controls</span>
        <span class="radar-tip">• Click and drag to pan • Scroll to zoom • Use controls for layers</span>
      </div>
    </div>`;
    
    return h;
  }

  hourly() {
    if (!this._weatherData.hourly?.length) return '';
    
    let h = '<div class="hourly">';
    
    // Only show header if configured to do so
    if (this._config.show_hourly_header) {
      h += '<div class="sec-hdr">12-Hour Forecast</div>';
    }
    
    h += '<div class="h-scroll">';
    
    for (const hr of this._weatherData.hourly.slice(0, 12)) {
      const t = new Date(hr.startTime).toLocaleTimeString([], {hour: 'numeric'});
      const icon = this.getIcon(hr.shortForecast);
      h += `<div class="h-item">
        <div class="h-time">${t}</div>
        <div class="h-icon">${icon}</div>
        <div class="h-temp">${hr.temperature}°</div>`;
      if (hr.probabilityOfPrecipitation?.value) {
        h += `<div class="h-pop">💧${hr.probabilityOfPrecipitation.value}%</div>`;
      }
      h += '</div>';
    }
    return h + '</div></div>';
  }

  forecast() {
    if (!this._weatherData.forecast?.length) return '';
    
    let h = '<div class="forecast">';
    
    // Only show header if configured to do so
    if (this._config.show_forecast_header) {
      h += `<div class="sec-hdr">${this._config.forecast_days}-Day Forecast</div>`;
    }
    
    const max = Math.min(this._config.forecast_days * 2, this._weatherData.forecast.length);
    for (let i = 0; i < max; i++) {
      const p = this._weatherData.forecast[i];
      const icon = this.getIcon(p.shortForecast);
      h += `<div class="f-item">
        <div class="f-name">${p.name}</div>
        <div class="f-icon">${icon}</div>
        <div class="f-temp">${p.temperature}°</div>
        <div class="f-desc">${p.shortForecast}</div>
      </div>`;
    }
    return h + '</div>';
  }

  footer() {
    const dataSource = this._weatherData?.source === 'nws' 
      ? 'Data from National Weather Service' 
      : 'Data from Open-Meteo & National Weather Services';
      
    return `<div class="footer">
      <div class="data-source">${dataSource}</div>
      ${this._config.show_branding ? '<div class="branding">YAWC v3.2 - Yet Another Weather Card</div>' : ''}
    </div>`;
  }

  getIcon(cond) {
    if (!cond) return '🌡️';
    const c = cond.toLowerCase();
    if (c.includes('sunny') || c.includes('clear')) return '☀️';
    if (c.includes('partly')) return '⛅';
    if (c.includes('cloudy')) return '☁️';
    if (c.includes('thunder')) return '⛈️';
    if (c.includes('rain') || c.includes('shower')) return '🌧️';
    if (c.includes('snow')) return '❄️';
    if (c.includes('fog') || c.includes('mist')) return '🌫️';
    if (c.includes('wind')) return '💨';
    if (c.includes('hot')) return '🔥';
    if (c.includes('cold')) return '🥶';
    return '🌡️';
  }

  getWindDir(deg) {
    const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    return dirs[Math.round(deg / 22.5) % 16];
  }

  css() {
    return `
ha-card { background: var(--card-background-color); border-radius: var(--ha-card-border-radius); overflow: hidden; }
.loading, .error { padding: 20px; text-align: center; }
.error { color: var(--error-color); }
.header { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid var(--divider-color); }
.title { font-size: 20px; font-weight: 500; }
.upd { font-size: 12px; color: var(--secondary-text-color); display: flex; align-items: center; gap: 8px; }
.refresh-btn { background: none; border: none; font-size: 16px; cursor: pointer; padding: 0; color: var(--primary-text-color); }
.alerts { margin: 16px; }
.alert { padding: 12px; margin-bottom: 8px; border-radius: 8px; color: white; }
.alert.severe { background: #d32f2f; }
.alert.moderate { background: #f57c00; }
.alert.minor { background: #1976d2; }
.alert-title { font-weight: bold; margin-bottom: 4px; }
.alert-desc { font-size: 13px; opacity: 0.95; }
.current { margin: 16px; }
.main { display: flex; align-items: center; gap: 20px; margin-bottom: 16px; }
.temp-block { display: flex; align-items: center; gap: 12px; }
.temp { font-size: 48px; font-weight: 300; line-height: 1; }
.time { font-size: 48px; font-weight: 300; line-height: 1; color: var(--secondary-text-color); }
.icon { font-size: 36px; }
.cond { font-size: 18px; flex: 1; }
.details { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; }
.det { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: var(--secondary-background-color); border-radius: 8px; }
.det span { color: var(--secondary-text-color); font-size: 13px; }
.det b { font-size: 14px; }
.sec-hdr { font-size: 16px; font-weight: 500; margin: 16px 16px 12px; padding: 8px 12px; background: var(--secondary-background-color); border-radius: 4px; }
.radar { margin: 16px; }
.radar-container { background: #1a1a1a; border-radius: 8px; overflow: hidden; position: relative; }
.windy-iframe { display: block; }
.radar-note { text-align: center; font-size: 12px; color: var(--secondary-text-color); margin-top: 8px; display: flex; flex-direction: column; gap: 4px; }
.radar-tip { font-size: 11px; opacity: 0.8; }
.hourly { margin: 16px; }
.h-scroll { display: flex; gap: 8px; overflow-x: auto; padding: 8px 0; }
.h-item { min-width: 70px; padding: 10px 8px; background: var(--secondary-background-color); border-radius: 8px; text-align: center; }
.h-time { font-size: 12px; color: var(--secondary-text-color); margin-bottom: 4px; }
.h-icon { font-size: 20px; margin: 4px 0; }
.h-temp { font-size: 16px; font-weight: bold; margin: 4px 0; }
.h-pop { font-size: 11px; color: #2196f3; }
.forecast { margin: 16px; }
.f-item { display: grid; grid-template-columns: 100px 30px 60px 1fr; align-items: center; padding: 12px; border-bottom: 1px solid var(--divider-color); gap: 8px; }
.f-item:last-child { border-bottom: none; }
.f-name { font-weight: 500; }
.f-icon { text-align: center; font-size: 20px; }
.f-temp { text-align: center; font-weight: bold; }
.f-desc { text-align: right; color: var(--secondary-text-color); font-size: 14px; }
.footer { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-top: 1px solid var(--divider-color); background: var(--secondary-background-color); }
.data-source, .branding { font-size: 11px; color: var(--secondary-text-color); }
@media (max-width: 600px) {
  .main { flex-direction: column; text-align: center; }
  .details { grid-template-columns: 1fr 1fr; }
  .f-item { grid-template-columns: 80px 25px 50px 1fr; font-size: 13px; }
}`;
  }

  getCardSize() { 
    return this._config.show_radar ? 9 : 6; 
  }
  
  static getConfigElement() {
    return document.createElement('yawc-card-editor');
  }
  
  static getStubConfig() { 
    return { 
      title: 'YAWC Weather', 
      show_radar: true,
      radar_zoom: 7,
      radar_height: 450,
      show_forecast: true,
      forecast_days: 5
    }; 
  }
}

// Configuration Editor
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
        .editor { padding: 16px; }
        .section { background: var(--secondary-background-color); padding: 12px; border-radius: 8px; margin-bottom: 16px; }
        .section-title { font-weight: 500; margin-bottom: 12px; color: var(--primary-text-color); }
        .form-group { margin-bottom: 12px; }
        label { display: block; margin-bottom: 4px; font-size: 14px; color: var(--primary-text-color); }
        input[type="text"], input[type="number"], select {
          width: 100%; padding: 8px; border: 1px solid var(--divider-color);
          border-radius: 4px; background: var(--card-background-color);
          color: var(--primary-text-color); box-sizing: border-box;
        }
        input[type="checkbox"] { margin-right: 8px; }
        .checkbox-label { display: flex; align-items: center; margin-bottom: 8px; cursor: pointer; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .info-box { background: var(--primary-color); color: white; padding: 12px; border-radius: 8px; margin-top: 16px; }
        .info-title { font-weight: 500; margin-bottom: 8px; }
        .info-content { font-size: 13px; line-height: 1.4; }
      </style>
      
      <div class="editor">
        <div class="section">
          <div class="section-title">Basic Settings</div>
          <div class="form-group">
            <label>Card Title</label>
            <input type="text" id="title" value="${this._config.title || 'YAWC Weather'}">
          </div>
          <div class="form-group">
            <label>Update Interval (minutes)</label>
            <input type="number" id="update_interval_min" value="${(this._config.update_interval || 300000) / 60000}" min="1" max="60">
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Location Settings</div>
          <div class="grid-2">
            <div class="form-group">
              <label>Latitude (optional)</label>
              <input type="number" id="latitude" value="${this._config.latitude || ''}" placeholder="Auto" step="0.0001">
            </div>
            <div class="form-group">
              <label>Longitude (optional)</label>
              <input type="number" id="longitude" value="${this._config.longitude || ''}" placeholder="Auto" step="0.0001">
            </div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Display Options</div>
          <label class="checkbox-label">
            <input type="checkbox" id="show_radar" ${this._config.show_radar !== false ? 'checked' : ''}>
            Show Windy Radar
          </label>
          <label class="checkbox-label">
            <input type="checkbox" id="show_alerts" ${this._config.show_alerts !== false ? 'checked' : ''}>
            Show Weather Alerts
          </label>
          <label class="checkbox-label">
            <input type="checkbox" id="show_hourly" ${this._config.show_hourly !== false ? 'checked' : ''}>
            Show Hourly Forecast
          </label>
          <label class="checkbox-label">
            <input type="checkbox" id="show_forecast" ${this._config.show_forecast !== false ? 'checked' : ''}>
            Show Extended Forecast
          </label>
          <label class="checkbox-label">
            <input type="checkbox" id="show_branding" ${this._config.show_branding !== false ? 'checked' : ''}>
            Show YAWC Branding
          </label>
        </div>
        
        <div class="section">
          <div class="section-title">Section Headers</div>
          <label class="checkbox-label">
            <input type="checkbox" id="show_radar_header" ${this._config.show_radar_header !== false ? 'checked' : ''}>
            Show "Windy.com Interactive Radar" Header
          </label>
          <label class="checkbox-label">
            <input type="checkbox" id="show_hourly_header" ${this._config.show_hourly_header !== false ? 'checked' : ''}>
            Show "12-Hour Forecast" Header
          </label>
          <label class="checkbox-label">
            <input type="checkbox" id="show_forecast_header" ${this._config.show_forecast_header !== false ? 'checked' : ''}>
            Show "X-Day Forecast" Header
          </label>
        </div>
        
        <div class="section">
          <div class="section-title">Radar Settings</div>
          <div class="form-group">
            <label>Radar Zoom Level</label>
            <input type="number" id="radar_zoom" value="${this._config.radar_zoom || 7}" min="5" max="10">
          </div>
          <div class="form-group">
            <label>Radar Height (pixels)</label>
            <input type="number" id="radar_height" value="${this._config.radar_height || 450}" min="300" max="600" step="50">
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Forecast Settings</div>
          <div class="form-group">
            <label>Forecast Days</label>
            <input type="number" id="forecast_days" value="${this._config.forecast_days || 5}" min="1" max="7">
          </div>
        </div>
        
        <div class="info-box">
          <div class="info-title">🌟 YAWC v3.2 Features</div>
          <div class="info-content">
            ✓ Stable Windy.com radar that doesn't refresh<br>
            ✓ Real-time NWS weather data<br>
            ✓ Weather alerts with severity levels<br>
            ✓ 12-hour hourly forecast with precipitation<br>
            ✓ Extended daily forecast<br>
            ✓ Interactive radar with multiple layers<br>
            ✓ Auto-updates without refreshing radar<br>
            ✓ Optional section headers for cleaner layout
          </div>
        </div>
      </div>
    `;
    
    this.attachListeners();
  }

  attachListeners() {
    // Text and number inputs
    const inputs = ['title', 'latitude', 'longitude', 'radar_zoom', 'radar_height', 'forecast_days'];
    inputs.forEach(id => {
      const input = this.shadowRoot.getElementById(id);
      if (input) {
        input.addEventListener('input', (e) => {
          let value = e.target.value;
          if (['latitude', 'longitude'].includes(id)) {
            value = value ? parseFloat(value) : null;
          } else if (['radar_zoom', 'radar_height', 'forecast_days'].includes(id)) {
            value = parseInt(value) || (id === 'radar_zoom' ? 7 : id === 'radar_height' ? 450 : 5);
          }
          this.updateConfig(id, value);
        });
      }
    });
    
    // Special handling for update interval
    const updateIntervalInput = this.shadowRoot.getElementById('update_interval_min');
    if (updateIntervalInput) {
      updateIntervalInput.addEventListener('input', (e) => {
        const minutes = parseInt(e.target.value) || 5;
        this.updateConfig('update_interval', minutes * 60000);
      });
    }
    
    // Checkboxes - Updated to include the new header options
    const checkboxes = ['show_radar', 'show_alerts', 'show_hourly', 'show_forecast', 'show_branding',
                       'show_radar_header', 'show_hourly_header', 'show_forecast_header'];
    checkboxes.forEach(id => {
      const checkbox = this.shadowRoot.getElementById(id);
      if (checkbox) {
        checkbox.addEventListener('change', (e) => {
          this.updateConfig(id, e.target.checked);
        });
      }
    });
  }

  updateConfig(key, value) {
    this._config = { ...this._config, [key]: value };
    this.configChanged(this._config);
  }
}

// Register the components
customElements.define('yawc-card', YetAnotherWeatherCard);
customElements.define('yawc-card-editor', YawcCardEditor);

// Register with HACS
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'yawc-card',
  name: 'YAWC - Yet Another Weather Card',
  description: 'NWS weather card with stable Windy radar',
  preview: false,
  documentationURL: 'https://github.com/cnewman402/yawc'
});

console.log('YAWC v3.2 - Complete with Configuration Editor!');
