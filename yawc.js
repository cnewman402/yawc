class YetAnotherWeatherCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._weatherData = null;
    this._updateInterval = null;
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
      radar_type: config.radar_type || 'composite', // 'composite', 'windy', or 'links'
      forecast_days: config.forecast_days || 5,
      radar_height: config.radar_height || 450,
      latitude: config.latitude || null,
      longitude: config.longitude || null
    };
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._weatherData) this.fetchWeatherData();
    this.render();
    this.startUpdateInterval();
  }

  connectedCallback() { this.startUpdateInterval(); }
  disconnectedCallback() { this.stopUpdateInterval(); }

  startUpdateInterval() {
    this.stopUpdateInterval();
    this._updateInterval = setInterval(() => this.fetchWeatherData(), this._config.update_interval);
  }

  stopUpdateInterval() {
    if (this._updateInterval) {
      clearInterval(this._updateInterval);
      this._updateInterval = null;
    }
  }

  async fetchWeatherData() {
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
      this.render();
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

  render() {
    if (!this._hass) return;
    let h = `<style>${this.css()}</style>`;
    if (!this._weatherData) {
      h += `<ha-card><div class="loading">Loading Weather Data...</div></ha-card>`;
    } else if (this._weatherData.error) {
      h += `<ha-card><div class="error">Error: ${this._weatherData.error}</div></ha-card>`;
    } else {
      h += '<ha-card>';
      h += this.header();
      if (this._config.show_alerts) h += this.alerts();
      h += this.current();
      if (this._config.show_radar) h += this.radar();
      if (this._config.show_hourly) h += this.hourly();
      if (this._config.show_forecast) h += this.forecast();
      h += `<div class="footer">Data: National Weather Service | YAWC v2.6.0</div>`;
      h += '</ha-card>';
    }
    this.shadowRoot.innerHTML = h;
    
    // Add event listener for radar refresh if using composite
    if (this._config.show_radar && this._config.radar_type === 'composite') {
      this.setupRadarRefresh();
    }
  }

  setupRadarRefresh() {
    const btn = this.shadowRoot.querySelector('.radar-refresh');
    if (btn) {
      btn.addEventListener('click', () => {
        const img = this.shadowRoot.querySelector('.radar-img');
        if (img) {
          const baseUrl = img.src.split('?t=')[0];
          img.src = baseUrl + '?t=' + Date.now();
        }
      });
    }
  }

  header() {
    const upd = this._weatherData.lastUpdated?.toLocaleTimeString() || '';
    return `<div class="header">
      <div class="title">${this._config.title}</div>
      <div class="upd">Updated: ${upd} 
        <button onclick="this.getRootNode().host.fetchWeatherData()">↻</button>
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
    
    if (c?.temperature?.value) {
      temp = Math.round(c.temperature.value * 9/5 + 32);
    } else if (f?.[0]) {
      const m = f[0].temperature.toString().match(/\d+/);
      temp = m ? m[0] : 'N/A';
    }
    
    if (c?.textDescription) cond = c.textDescription;
    else if (f?.[0]?.shortForecast) cond = f[0].shortForecast;

    let h = `<div class="current">
      <div class="main">
        <div class="temp-block">
          <div class="temp">${temp}°</div>
          <div class="icon">${this.getIcon(cond)}</div>
        </div>
        <div class="cond">${cond}</div>
      </div>
      <div class="details">`;
    
    if (c?.relativeHumidity?.value) {
      h += `<div class="det"><span>💧 Humidity</span><b>${Math.round(c.relativeHumidity.value)}%</b></div>`;
    }
    if (c?.windSpeed?.value) {
      const ws = Math.round(c.windSpeed.value * 2.237);
      const wd = c.windDirection?.value ? this.getWindDir(c.windDirection.value) : '';
      h += `<div class="det"><span>💨 Wind</span><b>${ws} mph ${wd}</b></div>`;
    }
    if (c?.barometricPressure?.value) {
      const p = Math.round(c.barometricPressure.value / 100);
      h += `<div class="det"><span>📊 Pressure</span><b>${p} mb</b></div>`;
    }
    if (c?.visibility?.value) {
      const v = Math.round(c.visibility.value / 1609.34);
      h += `<div class="det"><span>👁️ Visibility</span><b>${v} mi</b></div>`;
    }
    return h + '</div></div>';
  }

  radar() {
    const lat = this._weatherData.coords.lat;
    const lon = this._weatherData.coords.lon;
    const st = this._weatherData.radarStation || 'KLOT';
    
    let h = `<div class="radar">
      <div class="sec-hdr">Weather Radar</div>`;
    
    if (this._config.radar_type === 'windy') {
      // Windy embed (may have SSE errors but works)
      h += `<div class="radar-container">
        <iframe 
          width="100%" 
          height="${this._config.radar_height}" 
          src="https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&width=650&height=${this._config.radar_height}&zoom=7&level=surface&overlay=radar&product=radar&menu=&message=&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=mph&metricTemp=%C2%B0F&radarRange=-1" 
          frameborder="0"
          style="border: 0; border-radius: 8px;">
        </iframe>
      </div>
      <div class="radar-note">Windy.com Interactive Radar (may show console errors)</div>`;
    } else if (this._config.radar_type === 'composite') {
      // Use NOAA WMS composite radar image (most reliable)
      const bbox = `${lon - 2.5},${lat - 2},${lon + 2.5},${lat + 2}`;
      const radarUrl = `https://opengeo.ncep.noaa.gov/geoserver/conus/conus_bref_qcd/ows?service=WMS&version=1.3.0&request=GetMap&layers=conus_bref_qcd&bbox=${bbox}&width=600&height=400&srs=EPSG:4326&format=image/png&transparent=true`;
      
      h += `<div class="radar-container">
        <img class="radar-img" 
             src="${radarUrl}?t=${Date.now()}" 
             alt="NOAA Composite Radar"
             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MDAiIGhlaWdodD0iNDAwIj48cmVjdCB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iIzFhMWExYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE4IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiI+UmFkYXIgVGVtcG9yYXJpbHkgVW5hdmFpbGFibGU8L3RleHQ+PHRleHQgeD0iNTAlIiB5PSI2MCUiIGZpbGw9IiM2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iMTQiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIj5Vc2UgbGlua3MgYmVsb3cgZm9yIGFsdGVybmF0aXZlczwvdGV4dD48L3N2Zz4='">
        <button class="radar-refresh">↻ Refresh</button>
      </div>
      <div class="radar-note">NOAA Composite Radar - Updates every 5-10 minutes</div>`;
    } else {
      // Links only mode
      h += `<div class="radar-placeholder">
        <div class="radar-placeholder-text">
          <div>📡 Radar Station: ${st}</div>
          <div>Click any link below to view radar:</div>
        </div>
      </div>`;
    }
    
    h += `<div class="links">
      <a href="https://radar.weather.gov/station/${st}" target="_blank">NWS Radar</a>
      <a href="https://www.windy.com/?radar,${lat},${lon},8" target="_blank">Windy.com</a>
      <a href="https://weather.com/weather/radar/interactive/l/${lat},${lon}" target="_blank">Weather.com</a>
      <a href="https://www.wunderground.com/radar/us/${st.toLowerCase()}" target="_blank">WUnderground</a>
      <a href="https://zoom.earth/storms/${lat},${lon},7z" target="_blank">Zoom Earth</a>
    </div></div>`;
    
    return h;
  }

  hourly() {
    if (!this._weatherData.hourly?.length) return '';
    let h = '<div class="hourly"><div class="sec-hdr">12-Hour Forecast</div><div class="h-scroll">';
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
    let h = `<div class="forecast"><div class="sec-hdr">${this._config.forecast_days}-Day Forecast</div>`;
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
ha-card {
  background: var(--card-background-color);
  border-radius: var(--ha-card-border-radius);
  overflow: hidden;
}
.loading, .error {
  padding: 20px;
  text-align: center;
  font-size: 14px;
}
.error {
  color: var(--error-color);
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--divider-color);
}
.title {
  font-size: 20px;
  font-weight: 500;
}
.upd {
  font-size: 12px;
  color: var(--secondary-text-color);
  display: flex;
  align-items: center;
  gap: 8px;
}
.upd button {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 0;
  color: var(--primary-text-color);
}
.alerts {
  margin: 16px;
}
.alert {
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 8px;
  color: white;
}
.alert.severe {
  background: #d32f2f;
}
.alert.moderate {
  background: #f57c00;
}
.alert.minor {
  background: #1976d2;
}
.alert-title {
  font-weight: bold;
  margin-bottom: 4px;
}
.alert-desc {
  font-size: 13px;
  opacity: 0.95;
}
.current {
  margin: 16px;
}
.main {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 16px;
}
.temp-block {
  display: flex;
  align-items: center;
  gap: 12px;
}
.temp {
  font-size: 48px;
  font-weight: 300;
  line-height: 1;
}
.icon {
  font-size: 36px;
}
.cond {
  font-size: 18px;
  flex: 1;
}
.details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
}
.det {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: var(--secondary-background-color);
  border-radius: 8px;
}
.det span {
  color: var(--secondary-text-color);
  font-size: 13px;
}
.det b {
  font-size: 14px;
}
.sec-hdr {
  font-size: 16px;
  font-weight: 500;
  margin: 16px 16px 12px;
  padding: 8px 12px;
  background: var(--secondary-background-color);
  border-radius: 4px;
}
.radar {
  margin: 16px;
}
.radar-container {
  background: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.radar-img {
  width: 100%;
  height: auto;
  display: block;
}
.radar-refresh {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 8px 12px;
  background: rgba(0,0,0,0.8);
  color: white;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}
.radar-refresh:hover {
  background: rgba(0,0,0,0.95);
  border-color: rgba(255,255,255,0.4);
}
.radar-placeholder {
  padding: 60px 20px;
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  border-radius: 8px;
  text-align: center;
}
.radar-placeholder-text {
  color: #888;
  font-size: 14px;
}
.radar-placeholder-text div {
  margin: 8px 0;
}
.radar-note {
  text-align: center;
  font-size: 12px;
  color: var(--secondary-text-color);
  margin-top: 8px;
}
.links {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.links a {
  padding: 8px 12px;
  background: var(--primary-color);
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-size: 13px;
}
.links a:hover {
  opacity: 0.9;
}
.hourly {
  margin: 16px;
}
.h-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 8px 0;
}
.h-item {
  min-width: 70px;
  padding: 10px 8px;
  background: var(--secondary-background-color);
  border-radius: 8px;
  text-align: center;
}
.h-time {
  font-size: 12px;
  color: var(--secondary-text-color);
  margin-bottom: 4px;
}
.h-icon {
  font-size: 20px;
  margin: 4px 0;
}
.h-temp {
  font-size: 16px;
  font-weight: bold;
  margin: 4px 0;
}
.h-pop {
  font-size: 11px;
  color: #2196f3;
}
.forecast {
  margin: 16px;
}
.f-item {
  display: grid;
  grid-template-columns: 100px 30px 60px 1fr;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid var(--divider-color);
  gap: 8px;
}
.f-item:last-child {
  border-bottom: none;
}
.f-name {
  font-weight: 500;
}
.f-icon {
  text-align: center;
  font-size: 20px;
}
.f-temp {
  text-align: center;
  font-weight: bold;
}
.f-desc {
  text-align: right;
  color: var(--secondary-text-color);
  font-size: 14px;
}
.footer {
  padding: 12px 16px;
  border-top: 1px solid var(--divider-color);
  background: var(--secondary-background-color);
  font-size: 11px;
  color: var(--secondary-text-color);
  text-align: center;
}
@media (max-width: 600px) {
  .main {
    flex-direction: column;
    text-align: center;
  }
  .details {
    grid-template-columns: 1fr 1fr;
  }
  .f-item {
    grid-template-columns: 80px 25px 50px 1fr;
    font-size: 13px;
  }
}
    `;
  }

  getCardSize() { 
    return this._config.show_radar ? 9 : 6; 
  }
  
  static getStubConfig() { 
    return { 
      title: 'YAWC Weather', 
      show_radar: true, 
      radar_type: 'composite',
      radar_height: 450
    }; 
  }
}

customElements.define('yawc-card', YetAnotherWeatherCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'yawc-card',
  name: 'YAWC - Yet Another Weather Card',
  description: 'NWS weather card with working composite radar'
});
console.log('YAWC v2.6.0 Loaded - Fixed radar implementation!');
