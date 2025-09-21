console.log('YAWC v2.0.0 Loading...');

class YetAnotherWeatherCard extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
    console.log('YAWC setConfig called with:', this._config);
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  render() {
    // Check if we have the radar methods
    const hasRadarMethods = typeof this.fetchRadarData === 'function';
    console.log('YAWC render called. Has radar methods:', hasRadarMethods);
    
    let html = '<ha-card><div style="padding: 16px;">';
    html += '<h2>YAWC Debug Test</h2>';
    html += '<p>✅ Card is loading</p>';
    html += '<p>Has radar methods: ' + (hasRadarMethods ? '✅ YES' : '❌ NO') + '</p>';
    html += '<p>Config show_radar: ' + (this._config.show_radar !== false ? '✅ YES' : '❌ NO') + '</p>';
    
    // Show what methods exist
    const methods = [];
    for (let prop in this) {
      if (typeof this[prop] === 'function' && prop.includes('radar')) {
        methods.push(prop);
      }
    }
    html += '<p>Radar methods found: ' + (methods.length > 0 ? methods.join(', ') : 'None') + '</p>';
    
    html += '</div></ha-card>';
    
    this.innerHTML = html;
  }

  getCardSize() {
    return 3;
  }
}

class YawcCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
    this.render();
  }

  render() {
    this.innerHTML = '<div style="padding: 16px;"><p>✅ Debug config editor working</p></div>';
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
  name: 'YAWC Debug Test',
  description: 'Debug version to check what is loaded'
});

console.log('YAWC v2.0.0 Loaded Successfully!');
