console.info(
  '%c YAWC %c Yet Another Weather Card (NWS) v1.1.0-test ',
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray'
);

class YetAnotherWeatherCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
  }

  setConfig(config) {
    if (!config) {
      throw new Error('Invalid configuration');
    }
    this._config = {
      title: 'YAWC Weather Test',
      ...config
    };
    console.log('YAWC setConfig called successfully:', this._config);
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        ha-card {
          padding: 16px;
          background: var(--card-background-color);
          border-radius: var(--ha-card-border-radius);
          box-shadow: var(--ha-card-box-shadow);
        }
        .test-message {
          text-align: center;
          color: var(--primary-text-color);
          font-size: 18px;
          margin: 20px 0;
        }
        .success {
          color: green;
          font-weight: bold;
        }
      </style>
      <ha-card>
        <div class="test-message">
          <div class="success">✅ YAWC Test Version Loaded Successfully!</div>
          <div>Title: ${this._config.title}</div>
          <div>If you see this, the card is working.</div>
        </div>
      </ha-card>
    `;
  }

  getCardSize() {
    return 2;
  }

  static getConfigElement() {
    return document.createElement('yawc-editor');
  }

  static getStubConfig() {
    return {
      title: 'YAWC Test'
    };
  }
}

class YawcCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  setConfig(config) {
    this._config = config;
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
      <div style="padding: 16px;">
        <label>Card Title:</label>
        <input 
          type="text" 
          value="${this._config?.title || 'YAWC Test'}"
          style="width: 100%; margin-top: 8px; padding: 8px;"
        />
        <p style="color: green; margin-top: 12px;">✅ Configuration editor working!</p>
      </div>
    `;
  }
}

// Define the custom elements (MUST have hyphen in name!)
customElements.define('yawc-card', YetAnotherWeatherCard);
customElements.define('yawc-editor', YawcCardEditor);

// Register with Home Assistant
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'yawc-card',  // Updated to match the element name
  name: 'YAWC Test',
  description: 'Test version to verify installation',
  preview: false,
  documentationURL: 'https://github.com/cnewman402/yawc'
});

console.log('YAWC custom elements defined successfully');
