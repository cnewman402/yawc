class YetAnotherWeatherCard extends LitElement {
  static get properties() {
    return {
      hass: {},
      _config: {},
      _sun: {},
    };
  }

  // . . . (rest of the card's internal properties)

  setConfig(config) {
    if (!config.entity) {
      throw new Error("Please define a weather entity");
    }
    this._config = config;

    this._sun = this.hass.states["sun.sun"];

    this.weather = {
      state: "",
      name: "",
      temperature: 0,
      precipitation: 0,
      precipitation_probability: 0,
      precipitation_unit: "",
      humidity: 0,
      pressure: 0,
      wind_speed: 0,
      wind_bearing: 0,
      wind_unit: "",
      visibility: 0,
      visibility_unit: "",
      forecast: [],
      forecast_daily: [],
      forecast_hourly: [],
    };
  }

  // Check if the sun is down
  get isNight() {
    return this._sun.state == "below_horizon";
  }

  // Render the card
  render() {
    this.weather = {
      ...this.weather,
      name: this._config.name,
      ...this.hass.states[this._config.entity].attributes,
      state: this.hass.states[this._config.entity].state,
      temperature: this.hass.states[this._config.entity].attributes.temperature,
    };
    const lang = this.hass.selectedLanguage || this.hass.language;

    // Conditionally render the radar iframe based on a toggle entity
    const showRadar =
      this._config.radar_entity &&
      this.hass.states[this._config.radar_entity]?.state === "on";

    return html`
      <ha-card>
        <div class="yawc-card">
          <div class="yawc-header">
            <div class="yawc-header-side">
              ${this._config.name ? html` <div class="yawc-name">${this._config.name}</div> ` : ""}
              <div class="yawc-location">
                ${this.hass.config.location_name}
              </div>
            </div>
            <div class="yawc-header-side yawc-header-side-right">
              <div class="yawc-datetime">
                ${new Date().toLocaleTimeString(lang, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>

          <div class="yawc-current">
            <div class="yawc-current-container">
              <div class="yawc-current-icon">
                <img
                  class="yawc-weather-icon"
                  src="/static/images/weather-icons/animated/${this.weatherIcons[
                    this.weather.state
                  ]}.svg"
                  alt="${this.weather.state}"
                />
              </div>
              <div class="yawc-current-temperature">
                ${Math.round(this.weather.temperature)}
                <span class="yawc-unit">
                  ${this.hass.config.unit_system.temperature}
                </span>
              </div>
            </div>
          </div>

          <div class="yawc-details">
            ${this._config.show_precipitation_probability &&
            this.weather.precipitation_probability != null
              ? html`
                  <div class="yawc-detail">
                    <ha-icon icon="mdi:weather-rainy"></ha-icon>
                    <span class="yawc-detail-value">
                      ${this.weather.precipitation_probability} %
                    </span>
                  </div>
                `
              : ""}
            ${this._config.show_precipitation &&
            this.weather.precipitation != null
              ? html`
                  <div class="yawc-detail">
                    <ha-icon icon="mdi:weather-pouring"></ha-icon>
                    <span class="yawc-detail-value">
                      ${this.weather.precipitation}
                      <span class="yawc-unit">${this.weather.precipitation_unit}</span>
                    </span>
                  </div>
                `
              : ""}
            ${this._config.show_humidity && this.weather.humidity != null
              ? html`
                  <div class="yawc-detail">
                    <ha-icon icon="mdi:water-percent"></ha-icon>
                    <span class="yawc-detail-value">
                      ${this.weather.humidity} %
                    </span>
                  </div>
                `
              : ""}
            ${this._config.show_pressure && this.weather.pressure != null
              ? html`
                  <div class="yawc-detail">
                    <ha-icon icon="mdi:gauge"></ha-icon>
                    <span class="yawc-detail-value">
                      ${this.weather.pressure}
                      <span class="yawc-unit">
                        ${this.weather.pressure_unit}
                      </span>
                    </span>
                  </div>
                `
              : ""}
            ${this._config.show_wind && this.weather.wind_speed != null
              ? html`
                  <div class="yawc-detail">
                    <ha-icon icon="mdi:weather-windy"></ha-icon>
                    <span class="yawc-detail-value">
                      ${this.weather.wind_bearing != null ? html `<span>${this.getWindDirection(this.weather.wind_bearing)}</span>` : ''}
                      ${this.weather.wind_speed}
                      <span class="yawc-unit">${this.weather.wind_unit}</span>
                    </span>
                  </div>
                `
              : ""}
            ${this._config.show_visibility && this.weather.visibility != null
              ? html`
                  <div class="yawc-detail">
                    <ha-icon icon="mdi:eye"></ha-icon>
                    <span class="yawc-detail-value">
                      ${this.weather.visibility}
                      <span class="yawc-unit">
                        ${this.weather.visibility_unit}
                      </span>
                    </span>
                  </div>
                `
              : ""}
          </div>

          <div class="yawc-forecast">
            ${this.weather.forecast.slice(0, 5).map(
              (item) => html`
                <div class="yawc-forecast-day">
                  <div class="yawc-forecast-day-name">
                    ${new Date(item.datetime).toLocaleDateString(lang, {
                      weekday: "short",
                    })}
                  </div>
                  <div class="yawc-forecast-day-icon">
                    <img
                      class="yawc-weather-icon"
                      src="/static/images/weather-icons/animated/${this.weatherIcons[
                        item.condition
                      ]}.svg"
                      alt="${item.condition}"
                    />
                  </div>
                  <div class="yawc-forecast-day-temp">
                    ${Math.round(item.temperature)}
                    <span class="yawc-unit">
                      ${this.hass.config.unit_system.temperature}
                    </span>
                  </div>
                </div>
              `
            )}
          </div>

          ${showRadar ? this.renderRadar() : ""}
        </div>
      </ha-card>
    `;
  }

  // Render the radar iframe
  renderRadar() {
    const radarSource = this._config.radar_source || 'nws'; // Default to 'nws'
    let radarUrl;

    if (radarSource === 'windy') {
      const lat = this._config.radar_lat || this.hass.config.latitude;
      const lon = this._config.radar_lon || this.hass.config.longitude;
      const zoom = this._config.radar_zoom || 8;
      radarUrl = `https://embed.windy.com/embed.html?type=radar&lat=${lat}&lon=${lon}&zoom=${zoom}&product=radar`;
    } else { // Default to NWS
      if (!this._config.radar_station) {
        return html`<div class="yawc-radar-error">Error: 'radar_station' must be configured for NWS.</div>`;
      }
      radarUrl = `https://radar.weather.gov/station/${this._config.radar_station}/standard`;
    }

    const height = this._config.radar_height || '400px';

    return html`
      <div class="yawc-radar-container">
        <iframe
          src="${radarUrl}"
          style="width: 100%; height: ${height}; border: 0;"
          title="Weather Radar"
        ></iframe>
      </div>
    `;
  }

  getWindDirection(bearing) {
    const directions = [
      "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
      "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
    ];
    const index = Math.round(bearing / 22.5) % 16;
    return directions[index];
  }

  getCardSize() {
    return 4;
  }

  static get styles() {
    return css`
      .yawc-card {
        padding: 16px;
      }
      .yawc-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      .yawc-header-side-right {
        text-align: right;
      }
      .yawc-name {
        font-size: 24px;
        font-weight: 500;
        margin-bottom: 4px;
      }
      .yawc-location {
        font-size: 14px;
        color: var(--secondary-text-color);
      }
      .yawc-datetime {
        font-size: 14px;
        color: var(--secondary-text-color);
      }
      .yawc-current {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-bottom: 24px;
      }
      .yawc-current-container {
        display: flex;
        align-items: center;
      }
      .yawc-current-icon {
        margin-right: 16px;
      }
      .yawc-weather-icon {
        width: 64px;
        height: 64px;
      }
      .yawc-current-temperature {
        font-size: 48px;
        font-weight: 300;
      }
      .yawc-unit {
        font-size: 24px;
        color: var(--secondary-text-color);
      }
      .yawc-details {
        display: flex;
        justify-content: space-around;
        flex-wrap: wrap;
        margin-bottom: 16px;
      }
      .yawc-detail {
        display: flex;
        align-items: center;
        margin: 4px 8px;
      }
      .yawc-detail ha-icon {
