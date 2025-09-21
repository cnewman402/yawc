// Define everything upfront before any class definitions
console.log('YAWC: Immediate definition approach');

// Pre-define the setConfig function
function yawcSetConfig(config) {
  console.log('YAWC: Global setConfig called with:', config);
  
  if (!config || !config.latitude || !config.longitude) {
    throw new Error('Valid configuration with latitude and longitude required');
  }
  
  this.yawcConfig = config;
  this.yawcRender();
}

// Pre-define the render function
function yawcRender() {
  console.log('YAWC: Global render called');
  
  const config = this.yawcConfig;
  const title = config.title || 'YAWC Weather';
  
  this.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 12px;
      padding: 20px;
      color: white;
      font-family: system-ui;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    ">
      <h2 style="margin: 0 0 10px 0;">${title}</h2>
      <p style="margin: 0 0 20px 0; opacity: 0.9;">📍 ${config.latitude}, ${config.longitude}</p>
      <div style="font-size: 3em; margin: 20px 0;">⛅</div>
      <div style="font-size: 2.5em; font-weight: bold;">72°F</div>
      <div style="opacity: 0.9; margin: 10px 0;">Partly Cloudy</div>
      <div style="
        display: flex;
        justify-content: space-around;
        margin-top: 20px;
        gap: 10px;
      ">
        <div style="background: rgba(255,255,255,0.2); padding: 10px; border-radius: 8px; flex: 1;">
          <div style="font-size: 0.8em; opacity: 0.8;">Humidity</div>
          <div style="font-weight: bold;">65%</div>
        </div>
        <div style="background: rgba(255,255,255,0.2); padding: 10px; border-radius: 8px; flex: 1;">
          <div style="font-size: 0.8em; opacity: 0.8;">Wind</div>
          <div style="font-weight: bold;">12 mph</div>
        </div>
        <div style="background: rgba(255,255,255,0.2); padding: 10px; border-radius: 8px; flex: 1;">
          <div style="font-size: 0.8em; opacity: 0.8;">Pressure</div>
          <div style="font-weight: bold;">30.15"</div>
        </div>
      </div>
      <div style="margin-top: 15px; font-size: 0.8em; opacity: 0.7; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 10px;">
        YAWC v1.0.0 • ${new Date().toLocaleTimeString()}
      </div>
    </div>
  `;
}

// Simple class that assigns the pre-defined functions
class YawcWeatherCard extends HTMLElement {
  constructor() {
    super();
    console.log('YAWC: Simple constructor start');
    
    // Assign methods immediately
    this.setConfig = yawcSetConfig;
    this.yawcRender = yawcRender;
    this.yawcConfig = null;
    this._hass = null;
    
    // Verify method is assigned
    console.log('YAWC: setConfig assigned, type:', typeof this.setConfig);
    
    // Initial display
    this.innerHTML = `
      <div style="padding: 20px; background: #f0f8ff; border: 2px dashed #4169e1; border-radius: 8px; text-align: center; color: #4169e1;">
        <h3>🌦️ YAWC Ready</h3>
        <p>Waiting for Home Assistant to call setConfig...</p>
      </div>
    `;
    
    console.log('YAWC: Constructor complete');
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
customElements.define('yawc', YawcWeatherCard);

// Immediate test
const testElement = document.createElement('yawc');
console.log('YAWC: Test element setConfig type:', typeof testElement.setConfig);

if (testElement.setConfig) {
  console.log('YAWC: ✅ setConfig is available immediately');
  try {
    testElement.setConfig({
      title: 'Immediate Test',
      latitude: 40.8136,
      longitude: -96.7026
    });
    console.log('YAWC: ✅ Immediate test successful');
  } catch (e) {
    console.error('YAWC: ❌ Immediate test failed:', e);
  }
} else {
  console.error('YAWC: ❌ setConfig not available immediately');
}

// Home Assistant registration
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'yawc',
  name: 'YAWC Weather Card',
  description: 'Weather card with immediate method definition'
});

console.log('YAWC: All done - setConfig should be immediately available!');
