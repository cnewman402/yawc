console.log('YAWC Loading...');

class YetAnotherWeatherCard extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
    this._config.title = this._config.title || 'YAWC Weather';
    this._config.show_radar = this._config.show_radar !== false;
    this._config.radar_height = this._config.radar_height || 500;
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  render() {
    this.innerHTML = '<ha-card><div style="padding: 16px;"><h2>' + this._config.title + '</h2><p>✅ YAWC is working!</p><p>Weather data will load here.</p></div></ha-card>';
  }

  getCardSize() {
    return 2;
  }
}

class YawcCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
    this.render();
  }

  render() {
    this.innerHTML = '<div style="padding: 16px;"><label>Title: <input type="text" value="' + (this._config.title || 'YAWC Weather') + '"></label><p>✅ Config editor working</p></div>';
  }

  configChanged(config) {
    const event = new Event('config-changed', {
      bubbles: true,
      composed: true,
    });
    event.detail = { config: config };
    this.dispatchEvent(event);
  }
}

customElements.define('yawc-card', YetAnotherWeatherCard);
customElements.define('yawc-card-editor', YawcCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'yawc-card',
  name: 'YAWC Test Card',
  description: 'Ultra simple test version'
});

console.log('YAWC Loaded Successfully!');
