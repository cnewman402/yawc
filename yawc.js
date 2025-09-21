// Ultra simple test - if this doesn't work, something is very wrong
console.log('YAWC: Ultra simple test starting');

// Create constructor function (old school way)
function YawcCard() {
  const element = document.createElement('div');
  element.style.cssText = 'padding:20px;background:#f0f0f0;border:1px solid #ccc;border-radius:8px;';
  element.innerHTML = '<h3>YAWC Test Card</h3><p>If you see this, the element is working!</p>';
  return element;
}

// Create proper HTMLElement class
class YawcCard2 extends HTMLElement {
  connectedCallback() {
    console.log('YAWC: connectedCallback called');
    this.innerHTML = '<div style="padding:20px;background:lightblue;border-radius:8px;"><h3>YAWC Connected!</h3></div>';
  }
}

// Register the element
customElements.define('yawc-test', YawcCard2);
console.log('YAWC: yawc-test registered');

// Now create the real card
class YawcWeatherCard extends HTMLElement {
  constructor() {
    super();
    console.log('YAWC: Real constructor');
    this.attachShadow({mode: 'open'});
    this.shadowRoot.innerHTML = '<div>Constructor called</div>';
  }
  
  connectedCallback() {
    console.log('YAWC: Real connectedCallback');
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .card { padding: 20px; background: linear-gradient(45deg, #667eea, #764ba2); color: white; border-radius: 12px; }
      </style>
      <div class="card">
        <h2>YAWC Weather Card</h2>
        <p>This card is working but needs configuration...</p>
      </div>
    `;
  }
  
  setConfig(config) {
    console.log('YAWC: setConfig called with:', config);
    this.config = config;
    this.updateCard();
  }
  
  updateCard() {
    if (!this.config) return;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .card { 
          padding: 20px; 
          background: linear-gradient(45deg, #667eea, #764ba2); 
          color: white; 
          border-radius: 12px; 
          text-align: center;
          font-family: system-ui;
        }
        .temp { font-size: 3em; margin: 20px 0; }
        .details { display: flex; justify-content: space-around; margin-top: 20px; }
        .detail { background: rgba(255,255,255,0.2); padding: 10px; border-radius: 8px; }
      </style>
      <div class="card">
        <h2>${this.config.title || 'YAWC Weather'}</h2>
        <p>📍 ${this.config.latitude}, ${this.config.longitude}</p>
        <div style="font-size: 3em;">⛅</div>
        <div class="temp">72°F</div>
        <div>Partly Cloudy</div>
        <div class="details">
          <div class="detail">
            <div>Humidity</div>
            <div>65%</div>
          </div>
          <div class="detail">
            <div>Wind</div>
            <div>12 mph</div>
          </div>
          <div class="detail">
            <div>Pressure</div>
            <div>30.15"</div>
          </div>
        </div>
      </div>
    `;
  }
  
  set hass(hass) {
    this._hass = hass;
  }
  
  getCardSize() { return 4; }
  
  static getStubConfig() {
    return { latitude: 40.8136, longitude: -96.7026, title: 'Test Weather' };
  }
}

// Register the main card
customElements.define('yawc', YawcWeatherCard);
console.log('YAWC: Main card registered');

// Test both elements
setTimeout(() => {
  console.log('YAWC: Testing elements...');
  
  // Test 1
  const test1 = document.createElement('yawc-test');
  console.log('YAWC: Test1 created:', test1);
  
  // Test 2
  const test2 = document.createElement('yawc');
  console.log('YAWC: Test2 created:', test2);
  console.log('YAWC: setConfig exists:', typeof test2.setConfig);
  
  if (test2.setConfig) {
    test2.setConfig({title: 'Test', latitude: 40, longitude: -96});
    console.log('YAWC: ✅ setConfig worked!');
  } else {
    console.error('YAWC: ❌ setConfig missing');
  }
}, 500);

// Register with HA
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'yawc',
  name: 'YAWC Weather Card',
  description: 'Simple weather card test'
});

console.log('YAWC: All done!');
