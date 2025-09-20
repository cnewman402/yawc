console.log('YAWC: Starting...');

class YetAnotherWeatherCard extends HTMLElement {
  constructor() {
    super();
    console.log('YAWC: Constructor');
    this._hass = null;
    this.config = null;
  }
  
  setConfig(config) {
    console.log('YAWC: setConfig', config);
    if (!config || !config.latitude || !config.longitude) {
      throw new Error('Latitude and longitude required');
    }
    this.config = config;
    this.render();
  }
  
  render() {
    this.innerHTML = `
      <div style="
        background: linear-gradient(45deg, #667eea, #764ba2);
        border-radius: 12px;
        padding: 20px;
        color: white;
        font-family: sans-serif;
        text-align: center;
      ">
        <h2>${this.config.title || 'YAWC Weather'}</h2>
        <p>📍 ${this.config.latitude}, ${this.config.longitude}</p>
        <div style="font-size: 3em; margin: 20px 0;">⛅</div>
        <div style="font-size: 2.5em; font-weight: bold;">72°F</div>
        <div style="opacity: 0.9; margin: 10px 0;">Partly Cloudy</div>
        <div style="
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
          gap: 10px;
          margin-top: 20px;
        ">
          <div style="background: rgba(255,255,255,0.2); padding: 10px; border-radius: 8px;">
            <div style="font-size: 0.8em; opacity: 0.8;">Humidity</div>
            <div style="font-weight: bold;">65%</div>
          </div>
          <div style="background: rgba(255,255,255,0.2); padding: 10px; border-radius: 8px;">
            <div style="font-size: 0.8em; opacity: 0.8;">Wind</div>
            <div style="font-weight: bold;">12 mph</div>
          </div>
          <div style="background: rgba(255,255,255,0.2); padding: 10px; border-radius: 8px;">
            <div style="font-size: 0.8em; opacity: 0.8;">Pressure</div>
            <div style="font-weight: bold;">30.15"</div>
          </div>
        </div>
        <div style="margin-top: 15px; font-size: 0.8em; opacity: 0.7;">
          YAWC v1.0.0 • ${new Date().toLocaleTimeString()}
        </div>
      </div>
    `;
  }
  
  set hass(hass) {
    this._hass = hass;
  }
  
  get hass() {
    return this._hass;
  }
  
  getCardSize() {
    return 4;
  }
  
  static getStubConfig() {
    return {
      title: 'YAWC Weather',
      latitude: 40.8136,
      longitude: -96.7026
    };
  }
}

console.log('YAWC: Registering element...');
customElements.define('yawc', YetAnotherWeatherCard);

setTimeout(() => {
  const test = document.createElement('yawc');
  console.log('YAWC: Test setConfig:', typeof test.setConfig);
  if (typeof test.setConfig === 'function') {
    test.setConfig({title: 'Test', latitude: 40, longitude: -96});
    console.log('YAWC: ✅ Working!');
  }
}, 100);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'yawc',
  name: 'YAWC Weather Card',
  description: 'Simple weather card'
});

console.log('YAWC: Complete!');
