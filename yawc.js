/**
 * YAWC - Yet Another Weather Card
 * Simple Version for Home Assistant
 * 
 * @version 1.0.0
 * @author YAWC Team
 * @license MIT
 */

console.log('🌦️ YAWC: Starting simple version...');

// Simple ES6 class extending HTMLElement
class YetAnotherWeatherCard extends HTMLElement {
  constructor() {
    super();
    console.log('🌦️ YAWC: Constructor called');
    
    // Initialize properties
    this._hass = null;
    this.config = null;
    
    // Show initial content
    this.innerHTML = `
      <div style="
        padding: 20px; 
        border: 2px solid #2196F3; 
        border-radius: 12px; 
        background: #f5f5f5;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        margin: 8px 0;
      ">
        <h3 style="margin: 0 0 10px 0; color: #2196F3;">🌦️ YAWC Constructor Test</h3>
        <p style="margin: 0; color: #666;">Waiting for configuration...</p>
      </div>
    `;
    
    console.log('🌦️ YAWC: Constructor completed');
  }
  
  setConfig(config) {
    console.log('🌦️ YAWC: setConfig called with:', config);
    
    if (!config) {
      throw new Error('Configuration is required');
    }
    
    if (!config.latitude || !config.longitude) {
      throw new Error('Latitude and longitude are required');
    }
    
    // Store config
    this.config = {
      title: 'YAWC Weather',
      show_test_data: true,
      ...config
    };
    
    console.log('🌦️ YAWC: Config stored successfully');
    
    // Render the card
    this.render();
    
    console.log('🌦️ YAWC: setConfig completed successfully');
  }
  
  render() {
    console.log('🌦️ YAWC: Rendering card');
    
    this.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 16px;
        padding: 24px;
        margin: 8px 0;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 8px 32px rgba(0,0,0,0.1);
      ">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0 0 8px 0; font-size: 1.5em; font-weight: 600;">
            ${this.config.title}
          </h2>
          <div style="opacity: 0.9; font-size: 0.9em;">
            📍 ${this.config.latitude.toFixed(4)}, ${this.config.longitude.toFixed(4)}
          </div>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <div style="font-size: 4em; margin-bottom: 10px;">⛅</div>
          <div style="font-size: 3em; font-weight: bold; margin-bottom: 8px;">72°F</div>
          <div style="font-size: 1.2em; opacity: 0.9;">Partly Cloudy</div>
        </div>
        
        <div style="
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); 
          gap: 16px; 
          margin-top: 24px;
        ">
          <div style="
            background: rgba(255,255,255,0.2); 
            padding: 16px; 
            border-radius: 12px; 
            text-align: center;
            backdrop-filter: blur(10px);
          ">
            <div style="font-size: 0.9em; opacity: 0.8; margin-bottom: 4px;">Humidity</div>
            <div style="font-size: 1.4em; font-weight: bold;">65%</div>
          </div>
          
          <div style="
            background: rgba(255,255,255,0.2); 
            padding: 16px; 
            border-radius: 12px; 
            text-align: center;
            backdrop-filter: blur(10px);
          ">
            <div style="font-size: 0.9em; opacity: 0.8; margin-bottom: 4px;">Wind</div>
            <div style="font-size: 1.4em; font-weight: bold;">12 mph</div>
          </div>
          
          <div style="
            background: rgba(255,255,255,0.2); 
            padding: 16px; 
            border-radius: 12px; 
            text-align: center;
            backdrop-filter: blur(10px);
          ">
            <div style="font-size: 0.9em; opacity: 0.8; margin-bottom: 4px;">Pressure</div>
            <div style="font-size: 1.4em; font-weight: bold;">30.15"</div>
          </div>
          
          <div style="
            background: rgba(255,255,255,0.2); 
            padding: 16px; 
            border-radius: 12px; 
            text-align: center;
            backdrop-filter: blur(10px);
          ">
            <div style="font-size: 0.9em; opacity: 0.8; margin-bottom: 4px;">Feels Like</div>
            <div style="font-size: 1.4em; font-weight: bold;">76°F</div>
          </div>
        </div>
        
        <div style="
          margin-top: 24px; 
          text-align: center; 
          opacity: 0.7; 
          font-size: 0.8em;
          border-top: 1px solid rgba(255,255,255,0.2);
          padding-top: 16px;
        ">
          YAWC v1.0.0 • Sample Data • ${new Date().toLocaleTimeString()}
        </div>
      </div>
    `;
    
    console.log('🌦️ YAWC: Card rendered successfully');
  }
  
  set hass(hass) {
    console.log('🌦️ YAWC: hass setter called');
    this._hass = hass;
    
    // Could trigger real weather data fetch here
    if (this.config) {
      console.log('🌦️ YAWC: Ready to fetch weather data');
    }
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
      longitude: -96.7026,
      show_test_data: true
    };
  }
}

console.log('🌦️ YAWC: Class definition complete');

// Register the custom element
console.log('🌦️ YAWC: Attempting to register custom element...');

try {
  if (!customElements.get('yawc')) {
    customElements.define('yawc', YetAnotherWeatherCard);
    console.log('🌦️ YAWC: ✅ Custom element registered successfully');
  } else {
    console.log('🌦️ YAWC: Element already registered, skipping');
  }
} catch (error) {
  console.error('🌦️ YAWC: ❌ Failed to register custom element:', error);
}

// Verify registration
const registeredElement = customElements.get('yawc');
if (registeredElement) {
  console.log('🌦️ YAWC: ✅ Registration verified');
  console.log('🌦️ YAWC: Element constructor:', registeredElement.name);
} else {
  console.error('🌦️ YAWC: ❌ Registration verification failed');
}

// Test instance creation
try {
  const testInstance = document.createElement('yawc');
  console.log('🌦️ YAWC: Test instance created:', testInstance.constructor.name);
  console.log('🌦️ YAWC: setConfig method available:', typeof testInstance.setConfig);
  
  if (typeof testInstance.setConfig === 'function') {
    console.log('🌦️ YAWC: ✅ setConfig method is properly available');
    
    // Test calling setConfig
    try {
      testInstance.setConfig({
        title: 'Test Weather Card',
        latitude: 40.8136,
        longitude: -96.7026
      });
      console.log('🌦️ YAWC: ✅ setConfig test call successful');
    } catch (configError) {
      console.error('🌦️ YAWC: ❌ setConfig test call failed:', configError);
    }
  } else {
    console.error('🌦️ YAWC: ❌ setConfig method not available on instance');
  }
} catch (instanceError) {
  console.error('🌦️ YAWC: ❌ Failed to create test instance:', instanceError);
}

// Register with Home Assistant card picker
if (typeof window !== 'undefined') {
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: 'yawc',
    name: 'YAWC - Yet Another Weather Card',
    description: 'Simple, beautiful weather card with sample data',
    preview: true,
  });
  console.log('🌦️ YAWC: Added to Home Assistant card picker');
}

// Final success message
console.info(
  '%c YAWC %c v1.0.0 %c Ready to Use! ',
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
  'color: white; font-weight: bold; background: green'
);

console.log('🌦️ YAWC: Initialization complete. Try using type: custom:yawc in your dashboard!');
