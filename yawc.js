console.log('YAWC: Method fix approach loading...');

class YawcWeatherCard extends HTMLElement {
  constructor() {
    super();
    console.log('YAWC: Constructor start');
    
    // Define setConfig in multiple ways to ensure it exists
    this.setConfig = this.setConfig.bind(this);
    
    // Also define it directly on the instance
    const self = this;
    this.setConfig = function(config) {
      console.log('YAWC: Instance setConfig called with:', config);
      return self._setConfigImpl(config);
    };
    
    this.config = null;
    this._hass = null;
    
    // Create initial content
    this.innerHTML = `
      <div style="
        padding: 20px;
        background: #e3f2fd;
        border: 2px solid #2196f3;
        border-radius: 12px;
        text-align: center;
        font-family: system-ui;
      ">
        <h3 style="color: #1976d2; margin: 0 0 10px 0;">🌦️ YAWC Loading</h3>
        <p style="margin: 0; color: #666;">Waiting for configuration...</p>
      </div>
    `;
    
    console.log('YAWC: Constructor end, setConfig type:', typeof this.setConfig);
  }
  
  // Main implementation
  _setConfigImpl(config) {
    console.log('YAWC: _setConfigImpl called');
    
    if (!config) {
      throw new Error('Configuration is required');
    }
    
    if (!config.latitude || !config.longitude) {
      throw new Error('Latitude and longitude are required');
    }
    
    this.config = config;
    this._render();
    console.log('YAWC: Configuration completed');
  }
  
  // Also define as class method
  setConfig(config) {
    console.log('YAWC: Class setConfig called');
    return this._setConfigImpl(config);
  }
  
  _render() {
    console.log('YAWC: Rendering card');
    
    const title = this.config.title || 'YAWC Weather';
    const lat = this.config.latitude;
    const lon = this.config.longitude;
    
    this.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 16px;
        padding: 24px;
        color: white;
        font-family: system-ui, -apple-system, sans-serif;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        text-align: center;
      ">
        <h2 style="margin: 0 0 8px 0; font-size: 1.5em;">${title}</h2>
        <p style="margin: 0 0 20px 0; opacity: 0.9;">📍 ${lat.toFixed(4)}, ${lon.toFixed(4)}</p>
        
        <div style="margin: 30px 0;">
          <div style="font-size: 4em; margin-bottom: 10px;">⛅</div>
          <div style="font-size: 3em; font-weight: bold; margin-bottom: 8px;">72°F</div>
          <div style="font-size: 1.2em; opacity: 0.9;">Partly Cloudy</div>
        </div>
        
        <div style="
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          gap: 12px;
          margin-top: 24px;
        ">
          <div style="background: rgba(255,255,255,0.2); padding: 12px; border-radius: 8px;">
            <div style="font-size: 0.9em; opacity: 0.8;">Humidity</div>
            <div style="font-size: 1.3em; font-weight: bold;">65%</div>
          </div>
          <div style="background: rgba(255,255,255,0.2); padding: 12px; border-radius: 8px;">
            <div style="font-size: 0.9em; opacity: 0.8;">Wind</div>
            <div style="font-size: 1.3em; font-weight: bold;">12 mph</div>
          </div>
          <div style="background: rgba(255,255,255,0.2); padding: 12px; border-radius: 8px;">
            <div style="font-size: 0.9em; opacity: 0.8;">Pressure</div>
            <div style="font-size: 1.3em; font-weight: bold;">30.15"</div>
          </div>
        </div>
        
        <div style="
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid rgba(255,255,255,0.2);
          font-size: 0.8em;
          opacity: 0.7;
        ">
          YAWC v1.0.0 • Sample Data • ${new Date().toLocaleTimeString()}
        </div>
      </div>
    `;
  }
  
  set hass(hass) {
    console.log('YAWC: hass setter');
    this._hass = hass;
  }
  
  get hass() {
    return this._hass;
  }
  
  getCardSize() {
    return 5;
  }
  
  static getStubConfig() {
    return {
      title: 'YAWC Weather',
      latitude: 40.8136,
      longitude: -96.7026
    };
  }
}

// Also define setConfig on the prototype as backup
YawcWeatherCard.prototype.setConfig = function(config) {
  console.log('YAWC: Prototype setConfig called');
  return this._setConfigImpl(config);
};

console.log('YAWC: Class defined, registering...');

// Register element
customElements.define('yawc', YawcWeatherCard);
console.log('YAWC: Element registered');

// Comprehensive testing
setTimeout(() => {
  console.log('YAWC: Starting comprehensive test...');
  
  const element = document.createElement('yawc');
  console.log('YAWC: Element created:', element.constructor.name);
  console.log('YAWC: setConfig on instance:', typeof element.setConfig);
  console.log('YAWC: setConfig on prototype:', typeof YawcWeatherCard.prototype.setConfig);
  console.log('YAWC: _setConfigImpl on instance:', typeof element._setConfigImpl);
  
  // Try to call setConfig
  if (element.setConfig) {
    try {
      element.setConfig({
        title: 'Test Weather',
        latitude: 40.8136,
        longitude: -96.7026
      });
      console.log('YAWC: ✅ setConfig test successful');
    } catch (error) {
      console.error('YAWC: ❌ setConfig test failed:', error);
    }
  } else {
    console.error('YAWC: ❌ setConfig not found on element');
    
    // Try alternative approaches
    console.log('YAWC: Trying _setConfigImpl directly...');
    if (element._setConfigImpl) {
      try {
        element._setConfigImpl({
          title: 'Test Weather',
          latitude: 40.8136,
          longitude: -96.7026
        });
        console.log('YAWC: ✅ _setConfigImpl works');
      } catch (error) {
        console.error('YAWC: ❌ _setConfigImpl failed:', error);
      }
    }
  }
}, 200);

// Register with Home Assistant
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'yawc',
  name: 'YAWC Weather Card',
  description: 'Enhanced weather card with multiple method definitions'
});

console.log('YAWC: Registration complete - ready to test!');
