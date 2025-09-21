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
      radar_type: config.radar_type || 'image', // 'image' or 'iframe'
      forecast_days: config.forecast_days || 5,
      radar_zoom: config.radar_zoom || 8,
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
      this._weatherData = { error: 'No coordinates' };
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
      console.error('Error:', error);
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
      h += `<div class="footer">Data: National Weather Service | YAWC v2.4.0</div>`;
      h += '</ha-card>';
    }
    this.shadowRoot.innerHTML = h;
    
    // Add radar refresh handler after render
    if (this._config.show_radar && this._config.radar_type === 'image') {
      this.setupRadarRefresh();
    }
  }

  setupRadarRefresh() {
    const refreshBtn = this.shadowRoot.querySelector('.radar-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        const img = this.shadowRoot.querySelector('.radar-img');
        if (img) {
          const baseUrl = img.src.split('&t=')[0];
          img.src = baseUrl + '&t=' + Date.now();
        }
      });
    }
  }

  header() {
    const upd = this._weatherData.lastUpdated?.toLocaleTimeString() || '';
    return `<div class="header"><div class="title">${this._config.title}</div>
      <div class="upd">Updated: ${upd} <button onclick="this.getRootNode().host.fetchWeatherData()">↻</button></div></div>`;
  }

  alerts() {
    if (!this._weatherData.alerts?.length) return '';
    let h = '<div class="alerts">';
    for (const a of this._weatherData.alerts) {
      const p = a.properties;
      h += `<div class="alert ${(p.severity || 'Minor').toLowerCase()}">
        <b>${p.event}</b> - ${p.headline}</div>`;
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
    const st = this._weatherData.radarStation || 'N/A';
    
    let h = `<div class="radar">
      <div class="sec-hdr">Weather Radar - Station: ${st}</div>`;
    
    if (this._config.radar_type === 'image') {
      // Use static radar image from NWS or RainViewer
      const zoom = this._config.radar_zoom;
      const tileSize = 256;
      const scale = Math.pow(2, zoom);
      const centerX = (lon + 180) / 360 * scale;
      const centerY = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * scale;
      const tileX = Math.floor(centerX);
      const tileY = Math.floor(centerY);
      
      // RainViewer radar tile (updates every 10 minutes)
      const radarUrl = `https://tilecache.rainviewer.com/v2/radar/nowcast/${tileX}/${tileY}/${zoom}/256/1/1_0.png`;
      
      h += `<div class="radar-container">
        <img class="radar-img" src="${radarUrl}&t=${Date.now()}" alt="Radar" 
             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzIyMiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjODg4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE4Ij5SYWRhciBVbmF2YWlsYWJsZTwvdGV4dD48L3N2Zz4='">
        <button class="radar-refresh">↻ Refresh</button>
      </div>`;
    } else {
      // Simple iframe option without Windy
      h += `<div class="radar-container">
        <iframe width="100%" height="400" frameborder="0" style="border-radius:8px"
          src="https://radar.weather.gov/ridge/standard/${st}_loop.gif" 
          onerror="this.src='about:blank'"></iframe>
      </div>`;
    }
    
    h += `<div class="links">
      <a href="https://radar.weather.gov/station/${st}" target="_blank">NWS Radar</a>
      <a href="https://www.rainviewer.com/map.html?loc=${lat},${lon},${zoom}" target="_blank">RainViewer</a>
      <a href="https://weather.com/weather/radar/interactive/l/${lat},${lon}" target="_blank">Weather.com</a>
      <a href="https://www.wunderground.com/radar/us/${st}" target="_blank">WUnderground</a>
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
        <div class="f-desc">${p.shortForecast}</div></div>`;
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
    return '🌡️';
  }

  getWindDir(deg) {
    const dirs = ['N','NE','E','SE','S','SW','W','NW'];
    return dirs[Math.round(deg / 45) % 8];
  }

  css() {
    return `ha-card{background:var(--card-background-color);border-radius:var(--ha-card-border-radius);overflow:hidden}
.loading,.error{padding:20px;text-align:center}.error{color:var(--error-color)}
.header{display:flex;justify-content:space-between;padding:16px;border-bottom:1px solid var(--divider-color)}
.title{font-size:20px;font-weight:500}.upd{font-size:12px;color:var(--secondary-text-color)}
.upd button{background:none;border:none;font-size:16px;cursor:pointer;padding:0 0 0 8px}
.alerts{margin:16px}.alert{padding:8px 12px;margin-bottom:8px;border-radius:8px;color:white}
.alert.severe{background:#ff5722}.alert.moderate{background:#ff9800}.alert.minor{background:#2196f3}
.current{margin:16px}.main{display:flex;align-items:center;gap:20px;margin-bottom:16px}
.temp-block{display:flex;align-items:center;gap:12px}
.temp{font-size:48px;font-weight:300}.icon{font-size:36px}.cond{font-size:18px;flex:1}
.details{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}
.det{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--secondary-background-color);border-radius:8px}
.det span{color:var(--secondary-text-color);font-size:13px}.det b{font-size:14px}
.sec-hdr{font-size:16px;font-weight:500;margin:16px 16px 12px;padding:8px 12px;background:var(--secondary-background-color);border-radius:4px}
.radar{margin:16px}
.radar-container{position:relative;background:#000;border-radius:8px;overflow:hidden;min-height:300px;display:flex;align-items:center;justify-content:center}
.radar-img{width:100%;height:auto;max-height:400px;object-fit:contain}
.radar-refresh{position:absolute;top:10px;right:10px;padding:6px 12px;background:rgba(0,0,0,0.7);color:white;border:1px solid rgba(255,255,255,0.3);border-radius:4px;cursor:pointer;font-size:13px}
.radar-refresh:hover{background:rgba(0,0,0,0.9)}
.links{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
.links a{padding:6px 12px;background:var(--primary-color);color:white;text-decoration:none;border-radius:4px;font-size:13px}
.links a:hover{opacity:0.9}
.hourly{margin:16px}.h-scroll{display:flex;gap:8px;overflow-x:auto;padding:8px 0}
.h-item{min-width:70px;padding:8px;background:var(--secondary-background-color);border-radius:8px;text-align:center}
.h-time{font-size:12px;color:var(--secondary-text-color);margin-bottom:4px}
.h-icon{font-size:20px;margin:4px 0}.h-temp{font-size:16px;font-weight:bold;margin:4px 0}
.h-pop{font-size:11px;color:#2196f3}
.forecast{margin:16px}.f-item{display:grid;grid-template-columns:100px 30px 60px 1fr;align-items:center;padding:10px;border-bottom:1px solid var(--divider-color)}
.f-name{font-weight:500}.f-icon{text-align:center;font-size:20px}
.f-temp{text-align:center;font-weight:bold}.f-desc{text-align:right;color:var(--secondary-text-color);font-size:14px}
.footer{padding:12px 16px;border-top:1px solid var(--divider-color);background:var(--secondary-background-color);font-size:11px;color:var(--secondary-text-color);text-align:center}`;
  }

  getCardSize() { return this._config.show_radar ? 8 : 5; }
  static getStubConfig() { return { title: 'YAWC Weather', show_radar: true, radar_type: 'image' }; }
}

customElements.define('yawc-card', YetAnotherWeatherCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'yawc-card',
  name: 'YAWC - Yet Another Weather Card',
  description: 'Stable NWS weather card with radar'
});
console.log('YAWC v2.4.0 Loaded - Stable radar implementation!');
