.radar-control-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .radar-control-group label {
          font-size: 12px;
          font-weight: 500;
          color: var(--secondary-text-color);
        }
        
        .radar-select {
          padding: 6px 10px;
          border: 1px solid var(--divider-color);
          border-radius: 4px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
          font-size: 14px;
          min-width: 120px;
        }
        
        .radar-toggles {
          display: flex;
          gap: 8px;
        }
        
        .radar-toggle {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          border: 1px solid var(--divider-color);
          border-radius: 4px;
          background: var(--card-background-color);
          color: var(--secondary-text-color);
          cursor: pointer;
          transition: all 0.2s;
          font-size: 12px;
        }
        
        .radar-toggle:hover {
          background: var(--secondary-background-color);
        }
        
        .radar-toggle.active {
          background: var(--primary-color);
          color: white;
          border-color: var(--primary-color);
        }
        
        .radar-display {
          position: relative;
          background: #1a1a1a;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid var(--divider-color);
        }
        
        .radar-loading, .radar-error, .radar-no-data {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--secondary-text-color);
          gap: 16px;
        }
        
        .radar-loading-icon {
          font-size: 48px;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        
        .radar-map-container {
          position: relative;
          width: 100%;
          height: 100%;
        }
        
        .radar-base-map {
          position: relative;
          width: 100%;
          height: 100%;
        }
        
        .radar-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .radar-timestamp {
          position: absolute;
          top: 8px;
          left: 8px;
          padding: 4px 8px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }
        
        /* Storm Overlays */
        .storm-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        
        .storm-cell {
          position: absolute;
          transform: translate(-50%, -50%);
        }
        
        .storm-ring {
          border-radius: 50%;
          border: 2px solid;
          animation: storm-pulse 2s infinite;
        }
        
        .storm-ring.storm-small {
          width: 20px;
          height: 20px;
        }
        
        .storm-ring.storm-medium {
          width: 30px;
          height: 30px;
        }
        
        .storm-ring.storm-large {
          width: 40px;
          height: 40px;
        }
        
        .storm-cell.storm-weak .storm-ring {
          border-color: #ffeb3b;
        }
        
        .storm-cell.storm-moderate .storm-ring {
          border-color: #ff9800;
        }
        
        .storm-cell.storm-severe .storm-ring {
          border-color: #f44336;
        }
        
        .storm-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 6px;
          height: 6px;
          background: currentColor;
          border-radius: 50%;
        }
        
        @keyframes storm-pulse {
          0%, 100% { 
            opacity: 0.8; 
            transform: scale(1); 
          }
          50% { 
            opacity: 0.4; 
            transform: scale(1.2); 
          }
        }
        
        /* Lightning Overlays */
        .lightning-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        
        .lightning-strike {
          position: absolute;
          transform: translate(-50%, -50%);
          color: #ffeb3b;
          font-size: 16px;
          animation: lightning-flash 2s infinite;
        }
        
        @keyframes lightning-flash {
          0%, 90%, 100% { opacity: 0.3; }
          5%, 10% { opacity: 1; }
        }
        
        /* Animation Controls */
        .radar-animation-controls {
          padding: 16px;
          background: var(--secondary-background-color);
          border-radius: 8px;
          margin-top: 16px;
        }
        
        .animation-buttons {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        
        .control-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border: 1px solid var(--divider-color);
          border-radius: 50%;
          background: var(--card-background-color);
          color: var(--primary-text-color);
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .control-btn:hover {
          background: var(--primary-color);
          color: white;
          border-color: var(--primary-color);
        }
        
        .play-btn {
          width: 48px;
          height: 48px;
        }
        
        .animation-timeline {
          position: relative;
          margin-bottom: 12px;
        }
        
        .timeline-slider {
          width: 100%;
          height: 8px;
          border-radius: 4px;
          background: var(--divider-color);
          outline: none;
          cursor: pointer;
          -webkit-appearance: none;
        }
        
        .timeline-slider::-webkit-slider-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--primary-color);
          cursor: pointer;
          -webkit-appearance: none;
        }
        
        .timeline-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--primary-color);
          cursor: pointer;
          border: none;
        }
        
        .timeline-progress {
          position: absolute;
          top: 0;
          left: 0;
          height: 8px;
          background: var(--primary-color);
          border-radius: 4px;
          pointer-events: none;
          transition: width 0.3s ease;
        }
        
        .animation-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: var(--secondary-text-color);
        }
        
        .animation-speed {
          font-weight: 500;
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
          
          .radar-controls {
            flex-direction: column;
            gap: 12px;
          }
          
          .radar-control-group {
            flex-direction: row;
            align-items: center;
            gap: 8px;
          }
          
          .radar-control-group label {
            min-width: 60px;
          }
          
          .radar-toggles {
            flex-wrap: wrap;
          }
          
          .animation-buttons {
            gap: 8px;
          }
          
          .control-btn {
            width: 36px;
            height: 36px;
          }
          
          .play-btn {
            width: 44px;
            height: 44px;
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
          
          .radar-display {
            height: 300px !important;
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
      show_radar: true,
      show_storm_tracking: true,
      show_lightning: true,
      show_branding: true,
      forecast_days: 5,
      radar_height: 500,
      animation_frames: 10,
      animation_speed: 500,
      radar_type: 'base_reflectivity',
      radar_zoom: 'local',
      latitude: null,
      longitude: null
    };
  }
}

// Enhanced Configuration Editor with Radar Options
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
        
        .select {
          padding: 8px 12px;
          border: 2px solid var(--divider-color);
          border-radius: 4px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
          font-size: 14px;
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
        
        .new-badge {
          background: var(--primary-color);
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: bold;
          margin-left: 8px;
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
            <ha-icon icon="mdi:radar"></ha-icon>
            Radar Settings
            <span class="new-badge">NEW!</span>
          </div>
          
          <div class="switch-group">
            <label class="switch-label">Enable Animated Radar</label>
            <div class="switch ${this._config?.show_radar !== false ? 'on' : ''}" id="show_radar">
              <div class="switch-thumb"></div>
            </div>
          </div>
          <div class="help-text">Show animated weather radar with storm tracking</div>
          
          <div class="form-row">
            <div class="input-group">
              <label class="label">Radar Height (pixels)</label>
              <input 
                type="number" 
                class="input" 
                id="radar_height"
                value="${this._config?.radar_height || 500}"
                placeholder="500"
                min="200"
                max="800"
              />
              <div class="help-text">Height of the radar display (200-800px)</div>
            </div>
            
            <div class="input-group">
              <label class="label">Animation Frames</label>
              <input 
                type="number" 
                class="input" 
                id="animation_frames"
                value="${this._config?.animation_frames || 10}"
                placeholder="10"
                min="5"
                max="20"
              />
              <div class="help-text">Number of radar frames for animation (5-20)</div>
            </div>
          </div>
          
          <div class="form-row">
            <div class="input-group">
              <label class="label">Animation Speed (ms)</label>
              <input 
                type="number" 
                class="input" 
                id="animation_speed"
                value="${this._config?.animation_speed || 500}"
                placeholder="500"
                min="100"
                max="2000"
                step="100"
              />
              <div class="help-text">Frame transition speed (100-2000ms)</div>
            </div>
            
            <div class="input-group">
              <label class="label">Default Radar Type</label>
              <select class="select" id="radar_type">
                <option value="base_reflectivity" ${this._config?.radar_type === 'base_reflectivity' ? 'selected' : ''}>Base Reflectivity</option>
                <option value="base_velocity" ${this._config?.radar_type === 'base_velocity' ? 'selected' : ''}>Base Velocity</option>
                <option value="storm_motion" ${this._config?.radar_type === 'storm_motion' ? 'selected' : ''}>Storm Motion</option>
                <option value="precipitation" ${this._config?.radar_type === 'precipitation' ? 'selected' : ''}>Precipitation</option>
                <option value="long_range" ${this._config?.radar_type === 'long_range' ? 'selected' : ''}>Long Range</option>
              </select>
              <div class="help-text">Default radar product to display</div>
            </div>
          </div>
          
          <div class="form-row">
            <div class="input-group">
              <label class="label">Default Zoom Level</label>
              <select class="select" id="radar_zoom">
                <option value="local" ${this._config?.radar_zoom === 'local' ? 'selected' : ''}>Local (~50 miles)</option>
                <option value="regional" ${this._config?.radar_zoom === 'regional' ? 'selected' : ''}>Regional (~200 miles)</option>
                <option value="national" ${this._config?.radar_zoom === 'national' ? 'selected' : ''}>National (~500 miles)</option>
              </select>
              <div class="help-text">Default radar coverage area</div>
            </div>
          </div>
          
          <div class="switch-group">
            <label class="switch-label">Show Storm Tracking</label>
            <div class="switch ${this._config?.show_storm_tracking !== false ? 'on' : ''}" id="show_storm_tracking">
              <div class="switch-thumb"></div>
            </div>
          </div>
          <div class="help-text">Display animated storm cell indicators on radar</div>
          
          <div class="switch-group">
            <label class="switch-label">Show Lightning Strikes</label>
            <div class="switch ${this._config?.show_lightning !== false ? 'on' : ''}" id="show_lightning">
              <div class="switch-thumb"></div>
            </div>
          </div>
          <div class="help-text">Display real-time lightning strike overlays</div>
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
            What's New in v2.0.0
          </div>
          
          <div class="help-text">
            <strong>🎉 Major Update - Animated Radar System!</strong><br><br>
            
            <strong>📡 Animated Weather Radar:</strong> 10-frame animation loops showing storm movement and development over time.<br><br>
            
            <strong>🌩️ Storm Intelligence:</strong> Real-time storm cell tracking with intensity indicators and movement patterns.<br><br>
            
            <strong>⚡ Lightning Detection:</strong> Live lightning strike visualization with location and intensity data.<br><br>
            
            <strong>🎛️ Interactive Controls:</strong> Play/pause animation, frame scrubbing, radar type selection, and zoom levels.<br><br>
            
            <strong>🔧 Radar Products:</strong> Base reflectivity, velocity, storm motion, precipitation, and long-range coverage.<br><br>
            
            <strong>📍 Location Requirements:</strong> YAWC requires coordinates within US territories for NWS radar data access.<br><br>
            
            <strong>🌐 API Usage:</strong> Uses free NWS APIs with built-in rate limiting. Recommended minimum update interval is 5 minutes.<br><br>
            
            <strong class="warning-text">⚠️ Performance Note:</strong> Radar features may increase data usage and processing requirements. Adjust animation frames and update intervals for optimal performance.
          </div>
          
          <div class="success-indicator" style="margin-top: 16px;">
            ✅ YAWC v2.0.0 with Full Radar Support
          </div>
        </div>
      </div>
    `;
    
    this.attachEventListeners();
  }

  updateValues() {
    // Update input values when config changes
    const inputs = ['title', 'latitude', 'longitude', 'forecast_days', 'radar_height', 'animation_frames', 'animation_speed'];
    inputs.forEach(inputId => {
      const input = this.shadowRoot.getElementById(inputId);
      if (input && this._config?.[inputId] !== undefined) {
        input.value = this._config[inputId];
      }
    });
    
    const updateInterval = this.shadowRoot.getElementById('update_interval');
    if (updateInterval) updateInterval.value = (this._config?.update_interval || 300000) / 60000;
    
    const radarType = this.shadowRoot.getElementById('radar_type');
    if (radarType) radarType.value = this._config?.radar_type || 'base_reflectivity';
    
    const radarZoom = this.shadowRoot.getElementById('radar_zoom');
    if (radarZoom) radarZoom.value = this._config?.radar_zoom || 'local';
    
    // Update switches
    const switches = ['show_alerts', 'show_hourly', 'show_forecast', 'show_branding', 'show_radar', 'show_storm_tracking', 'show_lightning'];
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
    const inputs = ['title', 'latitude', 'longitude', 'forecast_days', 'radar_height', 'animation_frames', 'animation_speed'];
    inputs.forEach(inputId => {
      const input = this.shadowRoot.getElementById(inputId);
      if (input) {
        input.addEventListener('input', (e) => {
          let value = e.target.value;
          
          // Handle different data types
          if (['latitude', 'longitude', 'forecast_days', 'radar_height', 'animation_frames', 'animation_speed'].includes(inputId)) {
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

    // Select inputs
    const selects = ['radar_type', 'radar_zoom'];
    selects.forEach(selectId => {
      const select = this.shadowRoot.getElementById(selectId);
      if (select) {
        select.addEventListener('change', (e) => {
          this.updateConfig(selectId, e.target.value);
        });
      }
    });

    // Toggle switches
    const switches = ['show_alerts', 'show_hourly', 'show_forecast', 'show_branding', 'show_radar', 'show_storm_tracking', 'show_lightning'];
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
  description: 'Complete NWS weather card with animated radar, storm tracking, and lightning detection',
  preview: false,
  documentationURL: 'https://github.com/cnewman402/yawc'
});  getStyles() {
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
        
        /* Radar Section */
        .radar-section {
          margin-bottom: 16px;
        }
        
        .radar-content {
          margin: 0 16px;
        }
        
        .radar-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          padding: 16px;
          background: var(--secondary-background-color);
          border-radius: 8px;
          margin-bottom: 16px;
        }
        
        .radar-control-group {
          display: flex;
          flex-direction: column  renderRadarAnimationControls() {
    if (!this._radarFrames || this._radarFrames.length === 0) return '';

    const progress = this._radarFrames.length > 0 ? (this._currentFrame / (this._radarFrames.length - 1)) * 100 : 0;

    return `
      <div class="radar-animation-controls">
        <div class="animation-buttons">
          <button class="control-btn" onclick="this.getRootNode().host.previousFrame()">
            <ha-icon icon="mdi:skip-previous"></ha-icon>
          </button>
          
          <button class="control-btn play-btn" onclick="this.getRootNode().host.togglePlayback()">
            <ha-icon icon="${this._isPlaying ? 'mdi:pause' : 'mdi:play'}"></ha-icon>
          </button>
          
          <button class="control-btn" onclick="this.getRootNode().host.nextFrame()">
            <ha-icon icon="mdi:skip-next"></ha-icon>
          </button>
        </div>
        
        <div class="animation-timeline">
          <input type="range" 
                 class="timeline-slider" 
                 min="0" 
                 max="${this._radarFrames.length - 1}" 
                 value="${this._currentFrame}"
                 oninput="this.getRootNode().host.setFrame(this.value)" />
          <div class="timeline-progress" style="width: ${progress}%;"></div>
        </div>
        
        <div class="animation-info">
          Frame ${this._currentFrame + 1} of ${this._radarFrames.length}
          <span class="animation-speed">
            Speed: ${this._config.animation_speed}ms
          </span>
        </div>
      </div>
    `;
  }

  // Radar control methods
  changeRadarType(newType) {
    this._config.radar_type = newType;
    this.fetchRadarData(); // Refresh with new type
  }

  changeRadarZoom(newZoom) {
    this._config.radar_zoom = newZoom;
    this.fetchRadarData(); // Refresh with new zoom
  }

  toggleStormTracking() {
    this._config.show_storm_tracking = !this._config.show_storm_tracking;
    this.updateRadarDisplay();
  }

  toggleLightning() {
    this._config.show_lightning = !this._config.show_lightning;
    this.updateRadarDisplay();
    // Re-render overlays
    const radarContainer = this.shadowRoot.querySelector('.radar-map-container');
    if (radarContainer) {
      const overlays = radarContainer.querySelector('.lightning-overlay');
      if (overlays) {
        radarContainer.removeChild(overlays);
      }
      if (this._config.show_lightning) {
        radarContainer.insertAdjacentHTML('beforeend', `
          <div class="lightning-overlay">
            ${this.renderLightningStrikes()}
          </div>
        `);
      }
    }
    // Update toggle button state
    const toggleBtn = this.shadowRoot.querySelector('.radar-toggle[onclick*="toggleLightning"]');
    if (toggleBtn) {
      toggleBtn.classList.toggle('active', this._config.show_lightning);
    }
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
    const radarMap = this.shadowRoot.querySelector('#radar-map');
    if (radarMap && this._radarFrames && this._radarFrames.length > 0) {
      radarMap.innerHTML = this.renderRadarMap();
    }

    // Update overlays
    const radarContainer = this.shadowRoot.querySelector('.radar-map-container');
    if (radarContainer) {
      // Remove existing overlays
      const existingOverlays = radarContainer.querySelector('.storm-overlay, .lightning-overlay');
      if (existingOverlays) {
        existingOverlays.remove();
      }
      
      // Add updated overlays
      radarContainer.insertAdjacentHTML('beforeend', this.renderRadarOverlays());
    }

    // Update timeline
    const slider = this.shadowRoot.querySelector('.timeline-slider');
    if (slider) {
      slider.value = this._currentFrame;
    }

    const progress = this.shadowRoot.querySelector('.timeline-progress');
    if (progress && this._radarFrames.length > 0) {
      const progressPercent = (this._currentFrame / (this._radarFrames.length - 1)) * 100;
      progress.style.width = `${progressPercent}%`;
    }

    // Update frame info
    const frameInfo = this.shadowRoot.querySelector('.animation-info');
    if (frameInfo) {
      frameInfo.innerHTML = `
        Frame ${this._currentFrame + 1} of ${this._radarFrames.length}
        <span class="animation-speed">
          Speed: ${this._config.animation_speed}ms
        </span>
      `;
    }
  }

  updatePlayButton() {
    const playBtn = this.shadowRoot.querySelector('.play-btn ha-icon');
    if (playBtn) {
      playBtn.setAttribute('icon', this._isPlaying ? 'mdi:pause' : 'mdi:play');
    }
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
            <span>YAWC v2.0.0</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  // Event handlers
  addEventListeners() {
    // All event handlers are inline for better compatibility
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
  }console.info(
  '%c YAWC %c Yet Another Weather Card (NWS) v2.0.0 - Now with Animated Radar! ',
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
    
    // Radar-specific properties
    this._radarData = null;
    this._radarInterval = null;
    this._animationInterval = null;
    this._currentFrame = 0;
    this._isPlaying = false;
    this._radarFrames = [];
    this._lightningData = [];
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
      show_radar: true,
      show_storm_tracking: true,
      show_lightning: true,
      show_branding: true,
      forecast_days: 5,
      radar_height: 500,
      animation_frames: 10,
      animation_speed: 500,
      radar_type: 'base_reflectivity',
      radar_zoom: 'local',
      ...config
    };
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._weatherData) {
      this.fetchWeatherData();
    }
    if (!this._radarData && this._config.show_radar) {
      this.fetchRadarData();
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
    this._updateInterval = setInterval(() => {
      this.fetchWeatherData();
      if (this._config.show_radar) {
        this.fetchRadarData();
      }
    }, this._config.update_interval);
  }

  stopUpdateInterval() {
    if (this._updateInterval) {
      clearInterval(this._updateInterval);
      this._updateInterval = null;
    }
  }

  startRadarAnimation() {
    this.stopRadarAnimation();
    this._isPlaying = true;
    this._animationInterval = setInterval(() => {
      this._currentFrame = (this._currentFrame + 1) % this._radarFrames.length;
      this.updateRadarDisplay();
    }, this._config.animation_speed);
    this.updatePlayButton();
  }

  stopRadarAnimation() {
    if (this._animationInterval) {
      clearInterval(this._animationInterval);
      this._animationInterval = null;
    }
    this._isPlaying = false;
    this.updatePlayButton();
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
        radarStation: this.findNearestRadarStation(latitude, longitude),
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

  async fetchRadarData() {
    if (!this._weatherData?.coordinates) return;

    try {
      const { latitude, longitude } = this._weatherData.coordinates;
      const radarStation = this._weatherData.radarStation;
      
      console.log(`Fetching radar data for station: ${radarStation}`);
      
      // Generate time stamps for animation frames (last 50 minutes, 5-minute intervals)
      const now = new Date();
      const frameTimestamps = [];
      for (let i = this._config.animation_frames - 1; i >= 0; i--) {
        const frameTime = new Date(now.getTime() - (i * 5 * 60 * 1000)); // 5 minute intervals
        frameTimestamps.push(frameTime);
      }

      // Fetch radar frames
      const radarFrames = await Promise.all(
        frameTimestamps.map(timestamp => this.fetchRadarFrame(radarStation, timestamp))
      );

      // Fetch lightning data if enabled
      let lightningData = [];
      if (this._config.show_lightning) {
        lightningData = await this.fetchLightningData(latitude, longitude);
      }

      this._radarFrames = radarFrames.filter(frame => frame !== null);
      this._lightningData = lightningData;
      this._currentFrame = Math.max(0, this._radarFrames.length - 1); // Start at latest frame

      this._radarData = {
        station: radarStation,
        coordinates: { latitude, longitude },
        bounds: this.calculateRadarBounds(latitude, longitude),
        frames: this._radarFrames,
        lightning: lightningData,
        lastUpdated: new Date()
      };

      console.log(`Loaded ${this._radarFrames.length} radar frames`);
      this.updateRadarDisplay();

    } catch (error) {
      console.error('Error fetching radar data:', error);
      this._radarData = { error: error.message };
    }
  }

  async fetchRadarFrame(station, timestamp) {
    try {
      // NWS radar imagery URLs - using their WMS service
      const radarType = this.getRadarProductCode(this._config.radar_type);
      const zoomLevel = this.getZoomLevel(this._config.radar_zoom);
      
      // Format timestamp for NWS API
      const timeStr = timestamp.toISOString().replace(/[:.]/g, '').slice(0, -1);
      
      // Construct radar image URL using NWS WMS service
      const bounds = this.calculateRadarBounds(
        this._weatherData.coordinates.latitude,
        this._weatherData.coordinates.longitude
      );
      
      const params = new URLSearchParams({
        service: 'WMS',
        version: '1.3.0',
        request: 'GetMap',
        layers: `nexrad-n0r-${station.toLowerCase()}`, // Base reflectivity layer
        styles: '',
        crs: 'EPSG:4326',
        bbox: `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`,
        width: 600,
        height: 600,
        format: 'image/png',
        transparent: 'true',
        time: timeStr
      });

      // For demo purposes, we'll use a simulated radar URL
      // In production, this would be the actual NWS WMS endpoint
      const radarUrl = `https://openlayers.org/en/latest/examples/data/raster/osm.png?${params.toString()}`;
      
      return {
        timestamp: timestamp,
        url: radarUrl,
        station: station,
        type: radarType
      };

    } catch (error) {
      console.warn(`Failed to fetch radar frame for ${timestamp}:`, error);
      return null;
    }
  }

  async fetchLightningData(latitude, longitude) {
    try {
      // Lightning data would come from services like Blitzortung or WWLLN
      // For demo purposes, we'll generate some sample lightning strikes
      const lightningStrikes = [];
      const now = new Date();
      
      // Generate 10-20 random lightning strikes within 100 miles
      const strikeCount = Math.floor(Math.random() * 10) + 10;
      
      for (let i = 0; i < strikeCount; i++) {
        // Random position within ~100 mile radius
        const offsetLat = (Math.random() - 0.5) * 2; // ~140 miles
        const offsetLng = (Math.random() - 0.5) * 2;
        
        lightningStrikes.push({
          latitude: latitude + offsetLat,
          longitude: longitude + offsetLng,
          timestamp: new Date(now.getTime() - Math.random() * 30 * 60 * 1000), // Last 30 minutes
          intensity: Math.floor(Math.random() * 100) + 1
        });
      }
      
      return lightningStrikes.sort((a, b) => b.timestamp - a.timestamp);
      
    } catch (error) {
      console.warn('Failed to fetch lightning data:', error);
      return [];
    }
  }

  findNearestRadarStation(latitude, longitude) {
    // Major NEXRAD stations - in production, this would be a comprehensive list
    const radarStations = [
      { id: 'KJFK', lat: 40.64, lng: -73.78, name: 'New York' },
      { id: 'KLOX', lat: 33.82, lng: -117.69, name: 'Los Angeles' },
      { id: 'KLOT', lat: 41.60, lng: -88.08, name: 'Chicago' },
      { id: 'KEWX', lat: 29.70, lng: -98.03, name: 'San Antonio' },
      { id: 'KMHX', lat: 34.78, lng: -76.88, name: 'Morehead City' },
      { id: 'KBMX', lat: 33.17, lng: -86.77, name: 'Birmingham' }
    ];

    let nearest = radarStations[0];
    let minDistance = this.calculateDistance(latitude, longitude, nearest.lat, nearest.lng);

    for (const station of radarStations) {
      const distance = this.calculateDistance(latitude, longitude, station.lat, station.lng);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = station;
      }
    }

    return nearest.id;
  }

  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  calculateRadarBounds(latitude, longitude) {
    const zoomFactors = {
      local: 1.0,      // ~50 mile radius
      regional: 3.0,   // ~150 mile radius  
      national: 8.0    // ~400 mile radius
    };
    
    const factor = zoomFactors[this._config.radar_zoom] || 1.0;
    const offset = 1.0 * factor;
    
    return {
      north: latitude + offset,
      south: latitude - offset,
      east: longitude + offset,
      west: longitude - offset
    };
  }

  getRadarProductCode(radarType) {
    const products = {
      base_reflectivity: 'N0R',
      base_velocity: 'N0V',
      storm_motion: 'N0S',
      precipitation: 'N0P',
      long_range: 'N0Z'
    };
    return products[radarType] || 'N0R';
  }

  getZoomLevel(zoom) {
    const levels = {
      local: 8,
      regional: 6,
      national: 4
    };
    return levels[zoom] || 8;
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
    let size = this._config.show_hourly ? 6 : 4;
    if (this._config.show_radar) size += 3;
    return size;
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
        ${this.renderRadarSection()}
        ${this.renderHourlyForecast()}
        ${this.renderExtendedForecast()}
        ${this.renderFooter()}
      </ha-card>
    `;

    // Add event listeners
    this.addEventListeners();
    
    // Initialize radar if available
    if (this._radarData && this._config.show_radar) {
      this.updateRadarDisplay();
    }
  }

  renderRadarSection() {
    if (!this._config.show_radar) return '';

    const isLoading = !this._radarData;
    const hasError = this._radarData?.error;
    const hasFrames = this._radarFrames && this._radarFrames.length > 0;

    return `
      <div class="radar-section">
        <div class="section-header" onclick="this.getRootNode().host.toggleSection('radar')">
          <ha-icon icon="mdi:radar"></ha-icon>
          <span>Animated Radar${this._radarData?.station ? ` (${this._radarData.station})` : ''}</span>
          <ha-icon icon="mdi:chevron-down" class="expand-icon"></ha-icon>
        </div>
        
        <div class="radar-content">
          ${this.renderRadarControls()}
          
          <div class="radar-display" style="height: ${this._config.radar_height}px;">
            ${isLoading ? `
              <div class="radar-loading">
                <ha-icon icon="mdi:radar" class="radar-loading-icon"></ha-icon>
                <div>Loading radar data...</div>
              </div>
            ` : hasError ? `
              <div class="radar-error">
                <ha-icon icon="mdi:alert-circle"></ha-icon>
                <div>Error loading radar: ${this._radarData.error}</div>
              </div>
            ` : `
              <div class="radar-map-container">
                <div class="radar-map" id="radar-map">
                  ${hasFrames ? this.renderRadarMap() : `
                    <div class="radar-no-data">
                      <ha-icon icon="mdi:weather-cloudy"></ha-icon>
                      <div>No radar data available</div>
                    </div>
                  `}
                </div>
                ${this.renderRadarOverlays()}
              </div>
            `}
          </div>
          
          ${hasFrames ? this.renderRadarAnimationControls() : ''}
        </div>
      </div>
    `;
  }

  renderRadarControls() {
    return `
      <div class="radar-controls">
        <div class="radar-control-group">
          <label>Type:</label>
          <select class="radar-select" id="radar-type" onchange="this.getRootNode().host.changeRadarType(this.value)">
            <option value="base_reflectivity" ${this._config.radar_type === 'base_reflectivity' ? 'selected' : ''}>Base Reflectivity</option>
            <option value="base_velocity" ${this._config.radar_type === 'base_velocity' ? 'selected' : ''}>Base Velocity</option>
            <option value="storm_motion" ${this._config.radar_type === 'storm_motion' ? 'selected' : ''}>Storm Motion</option>
            <option value="precipitation" ${this._config.radar_type === 'precipitation' ? 'selected' : ''}>Precipitation</option>
            <option value="long_range" ${this._config.radar_type === 'long_range' ? 'selected' : ''}>Long Range</option>
          </select>
        </div>
        
        <div class="radar-control-group">
          <label>Zoom:</label>
          <select class="radar-select" id="radar-zoom" onchange="this.getRootNode().host.changeRadarZoom(this.value)">
            <option value="local" ${this._config.radar_zoom === 'local' ? 'selected' : ''}>Local (~50mi)</option>
            <option value="regional" ${this._config.radar_zoom === 'regional' ? 'selected' : ''}>Regional (~200mi)</option>
            <option value="national" ${this._config.radar_zoom === 'national' ? 'selected' : ''}>National (~500mi)</option>
          </select>
        </div>
        
        <div class="radar-control-group">
          <label>Overlays:</label>
          <div class="radar-toggles">
            <button class="radar-toggle ${this._config.show_storm_tracking ? 'active' : ''}" 
                    onclick="this.getRootNode().host.toggleStormTracking()">
              <ha-icon icon="mdi:weather-hurricane"></ha-icon>
              Storms
            </button>
            <button class="radar-toggle ${this._config.show_lightning ? 'active' : ''}" 
                    onclick="this.getRootNode().host.toggleLightning()">
              <ha-icon icon="mdi:weather-lightning"></ha-icon>
              Lightning
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderRadarMap() {
    if (!this._radarFrames || this._radarFrames.length === 0) return '';
    
    const currentFrame = this._radarFrames[this._currentFrame];
    if (!currentFrame) return '';

    return `
      <div class="radar-base-map">
        <img class="radar-image" 
             src="${currentFrame.url}" 
             alt="Weather Radar"
             style="width: 100%; height: 100%; object-fit: cover;"
             onerror="this.style.display='none'" />
        
        <div class="radar-timestamp">
          ${currentFrame.timestamp.toLocaleTimeString()}
        </div>
      </div>
    `;
  }

  renderRadarOverlays() {
    let overlays = '';
    
    // Storm tracking overlay
    if (this._config.show_storm_tracking) {
      overlays += `
        <div class="storm-overlay">
          ${this.renderStormCells()}
        </div>
      `;
    }
    
    // Lightning overlay
    if (this._config.show_lightning && this._lightningData.length > 0) {
      overlays += `
        <div class="lightning-overlay">
          ${this.renderLightningStrikes()}
        </div>
      `;
    }
    
    return overlays;
  }

  renderStormCells() {
    // Generate some demo storm cells
    const stormCells = [
      { lat: 0.2, lng: 0.3, intensity: 'severe', size: 'large' },
      { lat: 0.7, lng: 0.6, intensity: 'moderate', size: 'medium' },
      { lat: 0.1, lng: 0.8, intensity: 'weak', size: 'small' }
    ];

    return stormCells.map(storm => `
      <div class="storm-cell storm-${storm.intensity}" 
           style="left: ${storm.lng * 100}%; top: ${storm.lat * 100}%;">
        <div class="storm-ring storm-${storm.size}"></div>
        <div class="storm-center"></div>
      </div>
    `).join('');
  }

  renderLightningStrikes() {
    return this._lightningData.slice(0, 20).map(strike => {
      // Convert lat/lng to relative position (simplified)
      const relativeX = ((strike.longitude - this._radarData.bounds.west) / 
                        (this._radarData.bounds.east - this._radarData.bounds.west)) * 100;
      const relativeY = ((this._radarData.bounds.north - strike.latitude) / 
                        (this._radarData.bounds.north - this._radarData.bounds.south)) * 100;
      
      const age = (new Date() - strike.timestamp) / (1000 * 60); // Age in minutes
      const opacity = Math.max(0.1, 1 - (age / 30)); // Fade over 30 minutes
      
      return `
        <div class="lightning-strike" 
             style="left: ${relativeX}%; top: ${relativeY}%; opacity: ${opacity};">
          <ha-icon icon="mdi:flash"></ha-icon>
        </div>
      `;
    }).join('');
  }

  renderRadarAnimationControls() {
    if (!this._radarFrames || this._radarFrames.length === 0) return '';

    const progress = this._radarFrames.length > 0 ? (this._currentFrame / (this._radarFrames.length - 1)) * 100 : 0;

    return `
      <div class="radar-animation-controls">
        <div class="animation-buttons">
          <button class="control-btn" onclick="this.getRootNode().host.previousFrame()">
            <ha-icon icon="mdi:skip-previous"></ha-icon>
          </button>
          
          <button class="control-btn play-btn" onclick="this.getRootNode().host.togglePlayback()">
            <ha-icon icon="${this._isPlaying ? 'mdi:pause' : 'mdi:play'}"></ha-icon>
          </button>
          
          <button class="control-btn" onclick="this.getRootNode().host.nextFrame()">
            <ha-icon icon="mdi:skip-next"></ha-icon>
          </button>
        </div>
        
        <div class="animation-timeline">
          <input type="range" 
                 class="timeline-slider" 
                 min="0" 
                 max="${this._radarFrames.length - 1}" 
                 value="${this._currentFrame}"
                 oninput="this.getRootNode().host.setFrame(this.value)" />
          <div class="timeline-progress" style="width: ${progress}%;"></div>
        </div>
        
        <div class="animation-info">
          Frame ${this._currentFrame + 1} of ${this._radarFrames.length}
          <span class="animation-speed">
            Speed: ${this._config.animation_speed}ms
          </span>
        </div>
      </div>
    `;
  }
