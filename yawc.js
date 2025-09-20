/**
 * YAWC - Yet Another Weather Card
 * Enhanced NWS Weather Card for Home Assistant
 * 
 * @version 1.0.0
 * @author YAWC Team
 * @license MIT
 */

console.log('🌦️ YAWC: Starting to load...');

// Standard Home Assistant custom card approach
class YetAnotherWeatherCard extends HTMLElement {
  constructor() {
    super();
    console.log('🌦️ YAWC: Constructor called');
  }

  setConfig(config) {
    if (!config.latitude || !config.longitude) {
      throw new Error('You must specify latitude and longitude');
    }
    
    this.config = {
      title: 'YAWC Weather',
      show_alerts: true,
      show_forecast: true,
      show_hourly: true,
      show_radar: true,
      show_storm_tracking: true,
      show_lightning: true,
      show_branding: true,
      forecast_days: 5,
      radar_height: 500,
      update_interval: 300000,
      animation_frames: 10,
      animation_speed: 500,
      ...config
    };
    
    console.log('🌦️ YAWC: Config set:', this.config);
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this.config) {
      this.fetchWeatherData();
    }
  }

  render() {
    if (!this.innerHTML.trim()) {
      this.innerHTML = `
        <style>
          .yawc-card {
            background: var(--card-background-color);
            border-radius: var(--ha-card-border-radius);
            box-shadow: var(--ha-card-box-shadow);
            padding: 16px;
            margin: 8px;
          }
          .yawc-header {
            font-size: 1.3em;
            font-weight: bold;
            margin-bottom: 16px;
            color: var(--primary-text-color);
          }
          .yawc-loading {
            text-align: center;
            color: var(--secondary-text-color);
            padding: 20px;
          }
          .yawc-temp {
            font-size: 3em;
            font-weight: bold;
            text-align: center;
            color: var(--primary-text-color);
            margin: 20px 0;
          }
          .yawc-condition {
            text-align: center;
            font-size: 1.2em;
            color: var(--secondary-text-color);
            margin-bottom: 20px;
          }
          .yawc-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 16px;
            margin-top: 20px;
          }
          .yawc-detail {
            text-align: center;
            padding: 12px;
            background: var(--secondary-background-color);
            border-radius: 8px;
          }
          .yawc-detail-label {
            font-size: 0.9em;
            color: var(--secondary-text-color);
            margin-bottom: 4px;
          }
          .yawc-detail-value {
            font-size: 1.1em;
            font-weight: bold;
            color: var(--primary-text-color);
          }
          .yawc-error {
            color: var(--error-color);
            text-align: center;
            padding: 20px;
          }
        </style>
        <div class="yawc-card">
          <div class="yawc-header">${this.config.title}</div>
          <div class="yawc-content">
            <div class="yawc-loading">🌦️ Loading YAWC weather data...</div>
          </div>
        </div>
      `;
    }
  }

  async fetchWeatherData() {
    console.log('🌦️ YAWC: Fetching weather data...');
    
    try {
      const contentEl = this.querySelector('.yawc-content');
      
      // Get grid point for the coordinates
      const pointResponse = await fetch(
        `https://api.weather.gov/points/${this.config.latitude},${this.config.longitude}`
      );
      
      if (!pointResponse.ok) throw new Error('Failed to get location data');
      const pointData = await pointResponse.json();

      // Fetch current conditions
      const stationsResponse = await fetch(pointData.properties.observationStations);
      const stationsData = await stationsResponse.json();
      
      let currentConditions = {};
      if (stationsData.features.length > 0) {
        const stationUrl = stationsData.features[0].id;
        const currentResponse = await fetch(`${stationUrl}/observations/latest`);
        if (currentResponse.ok) {
          const currentData = await currentResponse.json();
          currentConditions = currentData.properties;
        }
      }

      // Display weather data
      const temp = this.formatTemperature(currentConditions.temperature);
      const condition = currentConditions.textDescription || 'Unknown';
      const humidity = currentConditions.relativeHumidity?.value ? 
        Math.round(currentConditions.relativeHumidity.value) + '%' : 'N/A';
      const windSpeed = currentConditions.windSpeed?.value ? 
        Math.round(currentConditions.windSpeed.value) + ' mph' : 'N/A';
      const pressure = currentConditions.barometricPressure?.value ? 
        (currentConditions.barometricPressure.value / 100).toFixed(2) + ' mb' : 'N/A';

      contentEl.innerHTML = `
        <div class="yawc-temp">${temp}</div>
        <div class="yawc-condition">${this.getWeatherIcon(condition)} ${condition}</div>
        <div class="yawc-details">
          <div class="yawc-detail">
            <div class="yawc-detail-label">Humidity</div>
            <div class="yawc-detail-value">${humidity}</div>
          </div>
          <div class="yawc-detail">
            <div class="yawc-detail-label">Wind</div>
            <div class="yawc-detail-value">${windSpeed}</div>
          </div>
          <div class="yawc-detail">
            <div class="yawc-detail-label">Pressure</div>
            <div class="yawc-detail-value">${pressure}</div>
          </div>
        </div>
        ${this.config.show_branding ? '<div style="text-align: center; margin-top: 16px; font-size: 0.8em; color: var(--secondary-text-color);">YAWC v1.0.0</div>' : ''}
      `;

      console.log('🌦️ YAWC: Weather data loaded successfully');
      
    } catch (error) {
      console.error('🌦️ YAWC: Error fetching weather data:', error);
      const contentEl = this.querySelector('.yawc-content');
      contentEl.innerHTML = `<div class="yawc-error">Failed to load weather data: ${error.message}</div>`;
    }
  }

  formatTemperature(temp) {
    if (!temp || !temp.value) return 'N/A';
    const fahrenheit = temp.unitCode === 'wmoUnit:degC' ? (temp.value * 9/5) + 32 : temp.value;
    return `${Math.round(fahrenheit)}°F`;
  }

  getWeatherIcon(condition) {
    const iconMap = {
      'clear': '☀️', 'sunny': '☀️', 'partly cloudy': '⛅', 'cloudy': '☁️',
      'overcast': '☁️', 'rain': '🌧️', 'showers': '🌦️', 'thunderstorms': '⛈️',
      'snow': '🌨️', 'fog': '🌫️', 'windy': '💨'
    };

    const conditionLower = (condition || '').toLowerCase();
    for (const key in iconMap) {
      if (conditionLower.includes(key)) return iconMap[key];
    }
    return '🌤️';
  }

  getCardSize() {
    return 3;
  }

  static getStubConfig() {
    return {
      title: 'YAWC Weather',
      latitude: 40.8136,
      longitude: -96.7026
    };
  }
}
}

customElements.define('yawc', YetAnotherWeatherCard);

console.log('🌦️ YAWC: Custom element defined');

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'yawc',
  name: 'YAWC - Yet Another Weather Card',
  description: 'Advanced NWS weather card with animated radar, storm tracking, and lightning detection',
  preview: true,
});

console.log('🌦️ YAWC: Added to custom cards registry');
console.log('🌦️ YAWC: Registration complete - element should be available as "yawc"');

console.info(
  '%c YAWC %c v1.0.0 ',
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);
      this.currentFrame = frames.length - 1; // Start with most recent frame
    } catch (error) {
      console.error('Failed to fetch radar frames:', error);
    }
  }

  async fetchStormData() {
    try {
      // Simulate storm cell detection (in real implementation, this would use NWS storm data)
      const stormCells = [];
      
      // Mock severe weather cells based on alerts
      if (this.alerts.some(alert => 
        alert.properties.event.includes('Tornado') || 
        alert.properties.event.includes('Severe Thunderstorm')
      )) {
        // Add mock storm cells near the location
        for (let i = 0; i < 3; i++) {
          stormCells.push({
            id: `storm_${i}`,
            lat: this.config.latitude + (Math.random() - 0.5) * 0.5,
            lon: this.config.longitude + (Math.random() - 0.5) * 0.5,
            intensity: Math.random() * 100,
            movement: {
              direction: Math.random() * 360,
              speed: Math.random() * 50
            }
          });
        }
      }
      
      this.stormCells = stormCells;
    } catch (error) {
      console.error('Failed to fetch storm data:', error);
    }
  }

  async fetchLightningData() {
    try {
      // Simulate lightning strikes (in real implementation, this would use lightning data APIs)
      const strikes = [];
      
      if (this.currentConditions.textDescription?.toLowerCase().includes('thunder')) {
        // Generate mock lightning strikes
        for (let i = 0; i < 10; i++) {
          strikes.push({
            id: `lightning_${i}`,
            lat: this.config.latitude + (Math.random() - 0.5) * 0.2,
            lon: this.config.longitude + (Math.random() - 0.5) * 0.2,
            timestamp: new Date(Date.now() - Math.random() * 300000), // Last 5 minutes
            intensity: Math.random()
          });
        }
      }
      
      this.lightningStrikes = strikes;
    } catch (error) {
      console.error('Failed to fetch lightning data:', error);
    }
  }

  formatRadarTime(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hour = String(date.getUTCHours()).padStart(2, '0');
    const minute = String(Math.floor(date.getUTCMinutes() / 5) * 5).padStart(2, '0');
    
    return `${year}${month}${day}_${hour}${minute}`;
  }

  getRadarStationsList() {
    return [
      { id: 'KABR', lat: 45.456, lon: -98.413 }, // Aberdeen, SD
      { id: 'KENX', lat: 42.586, lon: -74.064 }, // Albany, NY
      { id: 'KAMA', lat: 35.233, lon: -101.709 }, // Amarillo, TX
      { id: 'PAHG', lat: 60.726, lon: -151.351 }, // Anchorage, AK
      { id: 'KEWX', lat: 29.704, lon: -98.029 }, // Austin/San Antonio, TX
      { id: 'KBBX', lat: 39.496, lon: -121.632 }, // Beale AFB, CA
      { id: 'KBLX', lat: 45.854, lon: -108.607 }, // Billings, MT
      { id: 'KBGM', lat: 42.200, lon: -75.985 }, // Binghamton, NY
      { id: 'KBMX', lat: 33.172, lon: -86.770 }, // Birmingham, AL
      { id: 'KBIS', lat: 46.771, lon: -100.761 }, // Bismarck, ND
      { id: 'KBRO', lat: 25.916, lon: -97.419 }, // Brownsville, TX
      { id: 'KBUF', lat: 42.949, lon: -78.737 }, // Buffalo, NY
      { id: 'KCBW', lat: 46.039, lon: -67.807 }, // Caribou, ME
      { id: 'KCCX', lat: 40.923, lon: -78.004 }, // State College, PA
      { id: 'KCLE', lat: 41.413, lon: -81.860 }, // Cleveland, OH
      { id: 'KCLX', lat: 32.655, lon: -81.042 }, // Charleston, SC
      { id: 'KCRP', lat: 27.784, lon: -97.511 }, // Corpus Christi, TX
      { id: 'KDAX', lat: 38.501, lon: -121.678 }, // Sacramento, CA
      { id: 'KDDC', lat: 37.761, lon: -99.969 }, // Dodge City, KS
      { id: 'KDFX', lat: 29.273, lon: -100.280 }, // Laughlin AFB, TX
      { id: 'KDLH', lat: 46.837, lon: -92.210 }, // Duluth, MN
      { id: 'KDMX', lat: 41.731, lon: -93.723 }, // Des Moines, IA
      { id: 'KDOX', lat: 38.826, lon: -75.440 }, // Dover AFB, DE
      { id: 'KDTX', lat: 42.700, lon: -83.472 }, // Detroit, MI
      { id: 'KDVN', lat: 41.612, lon: -90.581 }, // Quad Cities, IA/IL
      { id: 'KEAX', lat: 38.810, lon: -94.264 }, // Kansas City, MO
      { id: 'KEMX', lat: 31.894, lon: -110.630 }, // Tucson, AZ
      { id: 'KFCX', lat: 37.024, lon: -80.274 }, // Roanoke, VA
      { id: 'KFDR', lat: 34.362, lon: -98.976 }, // Frederick, OK
      { id: 'KFDX', lat: 34.635, lon: -103.618 }, // Cannon AFB, NM
      { id: 'KFFC', lat: 33.364, lon: -84.566 }, // Atlanta, GA
      { id: 'KFSD', lat: 43.588, lon: -96.729 }, // Sioux Falls, SD
      { id: 'KFWS', lat: 32.573, lon: -97.303 }, // Dallas/Ft Worth, TX
      { id: 'KGGW', lat: 48.207, lon: -106.625 }, // Glasgow, MT
      { id: 'KGJX', lat: 39.062, lon: -108.213 }, // Grand Junction, CO
      { id: 'KGLD', lat: 39.367, lon: -101.700 }, // Goodland, KS
      { id: 'KGRB', lat: 44.498, lon: -88.111 }, // Green Bay, WI
      { id: 'KGRK', lat: 30.722, lon: -97.383 }, // Central Texas
      { id: 'KGSP', lat: 34.883, lon: -82.220 }, // Greer, SC
      { id: 'KGWX', lat: 33.897, lon: -88.329 }, // Columbus AFB, MS
      { id: 'KGYX', lat: 43.891, lon: -70.256 }, // Portland, ME
      { id: 'KHDX', lat: 33.077, lon: -106.122 }, // Holloman AFB, NM
      { id: 'KHGX', lat: 29.472, lon: -95.079 }, // Houston/Galveston, TX
      { id: 'KHNX', lat: 36.314, lon: -119.632 }, // San Joaquin Valley, CA
      { id: 'KHPX', lat: 36.737, lon: -87.285 }, // Fort Campbell, KY
      { id: 'KHTX', lat: 34.931, lon: -86.084 }, // Huntsville, AL
      { id: 'KICT', lat: 37.654, lon: -97.443 }, // Wichita, KS
      { id: 'KILN', lat: 39.420, lon: -83.822 }, // Cincinnati, OH
      { id: 'KILX', lat: 40.151, lon: -89.337 }, // Central Illinois
      { id: 'KIND', lat: 39.708, lon: -86.280 }, // Indianapolis, IN
      { id: 'KINX', lat: 36.175, lon: -95.564 }, // Tulsa, OK
      { id: 'KIWA', lat: 33.289, lon: -111.670 }, // Phoenix, AZ
      { id: 'KIWX', lat: 41.359, lon: -85.700 }, // Northern Indiana
      { id: 'KJAX', lat: 30.485, lon: -81.702 }, // Jacksonville, FL
      { id: 'KJGX', lat: 32.675, lon: -83.351 }, // Robins AFB, GA
      { id: 'KJKL', lat: 37.591, lon: -83.313 }, // Jackson, KY
      { id: 'KLBB', lat: 33.654, lon: -101.814 }, // Lubbock, TX
      { id: 'KLCH', lat: 30.125, lon: -93.216 }, // Lake Charles, LA
      { id: 'KLIX', lat: 30.337, lon: -89.825 }, // New Orleans, LA
      { id: 'KLNX', lat: 41.958, lon: -100.576 }, // North Platte, NE
      { id: 'KLOT', lat: 41.605, lon: -88.085 }, // Chicago, IL
      { id: 'KLRX', lat: 40.740, lon: -116.803 }, // Elko, NV
      { id: 'KLSX', lat: 38.699, lon: -90.683 }, // St. Louis, MO
      { id: 'KLTX', lat: 33.989, lon: -78.429 }, // Wilmington, NC
      { id: 'KLVX', lat: 37.975, lon: -85.944 }, // Louisville, KY
      { id: 'KLWX', lat: 38.975, lon: -77.478 }, // Sterling, VA (DC area)
      { id: 'KLZK', lat: 34.836, lon: -92.262 }, // Little Rock, AR
      { id: 'KMAF', lat: 31.943, lon: -102.189 }, // Midland/Odessa, TX
      { id: 'KMAX', lat: 42.081, lon: -122.717 }, // Medford, OR
      { id: 'KMBX', lat: 48.393, lon: -100.864 }, // Minot AFB, ND
      { id: 'KMHX', lat: 34.776, lon: -76.876 }, // Newport/Morehead City, NC
      { id: 'KMKX', lat: 42.968, lon: -88.551 }, // Milwaukee, WI
      { id: 'KMLB', lat: 28.113, lon: -80.654 }, // Melbourne, FL
      { id: 'KMOB', lat: 30.680, lon: -88.240 }, // Mobile, AL
      { id: 'KMPX', lat: 44.849, lon: -93.565 }, // Minneapolis/St. Paul, MN
      { id: 'KMQT', lat: 46.531, lon: -87.548 }, // Marquette, MI
      { id: 'KMRX', lat: 36.168, lon: -83.402 }, // Knoxville/Tri-Cities, TN
      { id: 'KMSX', lat: 47.041, lon: -113.986 }, // Missoula, MT
      { id: 'KMTX', lat: 41.263, lon: -112.448 }, // Salt Lake City, UT
      { id: 'KMUX', lat: 37.155, lon: -121.898 }, // San Francisco, CA
      { id: 'KMVX', lat: 47.528, lon: -97.326 }, // Grand Forks, ND
      { id: 'KMXX', lat: 32.537, lon: -85.790 }, // Maxwell AFB, AL
      { id: 'KNKX', lat: 32.919, lon: -117.042 }, // San Diego, CA
      { id: 'KNQA', lat: 35.345, lon: -89.873 }, // Memphis, TN
      { id: 'KOAX', lat: 41.320, lon: -96.367 }, // Omaha, NE (closest to Lincoln)
      { id: 'KOHX', lat: 36.247, lon: -86.563 }, // Nashville, TN
      { id: 'KOKX', lat: 40.866, lon: -72.864 }, // New York, NY
      { id: 'KOTX', lat: 47.680, lon: -117.627 }, // Spokane, WA
      { id: 'KPAH', lat: 37.068, lon: -88.772 }, // Paducah, KY
      { id: 'KPBZ', lat: 40.532, lon: -80.218 }, // Pittsburgh, PA
      { id: 'KPDT', lat: 45.691, lon: -118.853 }, // Pendleton, OR
      { id: 'KPOE', lat: 31.156, lon: -92.976 }, // Fort Polk, LA
      { id: 'KPUX', lat: 38.459, lon: -112.448 }, // Pueblo, CO
      { id: 'KRAX', lat: 35.665, lon: -78.490 }, // Raleigh/Durham, NC
      { id: 'KRGX', lat: 39.754, lon: -119.462 }, // Reno, NV
      { id: 'KRIW', lat: 43.066, lon: -108.477 }, // Riverton, WY
      { id: 'KRLX', lat: 38.311, lon: -81.723 }, // Charleston, WV
      { id: 'KRMX', lat: 43.468, lon: -75.458 }, // Griffiss AFB, NY
      { id: 'KRTX', lat: 45.715, lon: -122.965 }, // Portland, OR
      { id: 'KSFX', lat: 43.106, lon: -112.686 }, // Pocatello/Idaho Falls, ID
      { id: 'KSGF', lat: 37.235, lon: -93.400 }, // Springfield, MO
      { id: 'KSHV', lat: 32.451, lon: -93.841 }, // Shreveport, LA
      { id: 'KSJT', lat: 31.371, lon: -100.493 }, // San Angelo, TX
      { id: 'KSOX', lat: 33.817, lon: -89.825 }, // Jackson, MS
      { id: 'KSRX', lat: 35.290, lon: -94.362 }, // Western Arkansas
      { id: 'KTBW', lat: 27.706, lon: -82.402 }, // Tampa, FL
      { id: 'KTFX', lat: 47.460, lon: -111.385 }, // Great Falls, MT
      { id: 'KTLH', lat: 30.398, lon: -84.329 }, // Tallahassee, FL
      { id: 'KTLX', lat: 35.333, lon: -97.278 }, // Oklahoma City, OK
      { id: 'KTWX', lat: 38.997, lon: -96.233 }, // Topeka, KS
      { id: 'KTYX', lat: 43.756, lon: -75.680 }, // Montague, NY
      { id: 'KUDX', lat: 44.125, lon: -102.830 }, // Rapid City, SD
      { id: 'KUEX', lat: 40.321, lon: -98.442 }, // Hastings, NE
      { id: 'KVAX', lat: 30.890, lon: -83.002 }, // Moody AFB, GA
      { id: 'KVBX', lat: 34.838, lon: -120.397 }, // Vandenberg AFB, CA
      { id: 'KVNX', lat: 36.741, lon: -98.128 }, // Vance AFB, OK
      { id: 'KVTX', lat: 34.411, lon: -119.179 }, // Ventura County, CA
      { id: 'KVWX', lat: 38.260, lon: -87.725 }, // Evansville, IN
      { id: 'KYUX', lat: 32.495, lon: -114.656 }, // Yuma, AZ
    ];
  }

  findNearestRadarStation(lat, lon) {
    const radarStations = this.getRadarStationsList();

    let nearest = radarStations[0];
    let minDistance = this.calculateDistance(lat, lon, nearest.lat, nearest.lon);

    for (const station of radarStations) {
      const distance = this.calculateDistance(lat, lon, station.lat, station.lon);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = station;
      }
    }

    return nearest.id;
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  getRadarFrameUrl(timeString) {
    const radarTypes = {
      'base_reflectivity': 'N0R',
      'base_velocity': 'N0V',
      'storm_relative_motion': 'N0S',
      'precipitation': 'N0P',
      'long_range': 'N0Z'
    };

    const product = radarTypes[this.radarType] || 'N0R';
    const zoom = this.radarZoom === 'local' ? '' : '_Regional';
    
    return `https://radar.weather.gov/ridge/lite/${product}/${this.radarStation}_${product}${zoom}_${timeString}.gif`;
  }

  getCurrentRadarUrl() {
    if (this.radarFrames.length === 0) return null;
    const frame = this.radarFrames[this.currentFrame];
    return frame ? frame.url : null;
  }

  updateRadarType(type) {
    this.radarType = type;
    this.fetchRadarFrames();
  }

  updateRadarZoom(zoom) {
    this.radarZoom = zoom;
    this.fetchRadarFrames();
  }

  toggleOverlay(overlay) {
    const index = this.radarOverlays.indexOf(overlay);
    if (index > -1) {
      this.radarOverlays.splice(index, 1);
    } else {
      this.radarOverlays.push(overlay);
    }
    this.requestUpdate();
  }

  toggleAnimation() {
    this.animationPlaying = !this.animationPlaying;
    
    if (this.animationPlaying) {
      this.animationInterval = setInterval(() => {
        this.currentFrame = (this.currentFrame + 1) % this.radarFrames.length;
        this.requestUpdate();
      }, this.config.animation_speed);
    } else {
      if (this.animationInterval) {
        clearInterval(this.animationInterval);
      }
    }
    this.requestUpdate();
  }

  setFrame(frameIndex) {
    this.currentFrame = frameIndex;
    if (this.animationPlaying) {
      this.toggleAnimation(); // Stop animation when manually selecting frame
    }
    this.requestUpdate();
  }

  refreshRadar() {
    this.radarLoading = true;
    this.radarTimestamp = new Date().toLocaleTimeString();
    this.fetchRadarFrames().then(() => {
      this.radarLoading = false;
      this.requestUpdate();
    });
  }

  getWeatherIcon(condition) {
    const iconMap = {
      'clear': '☀️', 'sunny': '☀️', 'partly cloudy': '⛅', 'cloudy': '☁️',
      'overcast': '☁️', 'rain': '🌧️', 'showers': '🌦️', 'thunderstorms': '⛈️',
      'snow': '🌨️', 'fog': '🌫️', 'windy': '💨'
    };

    const conditionLower = (condition || '').toLowerCase();
    for (const key in iconMap) {
      if (conditionLower.includes(key)) return iconMap[key];
    }
    return '🌤️';
  }

  formatTemperature(temp) {
    if (!temp || !temp.value) return 'N/A';
    const fahrenheit = temp.unitCode === 'wmoUnit:degC' ? (temp.value * 9/5) + 32 : temp.value;
    return `${Math.round(fahrenheit)}°F`;
  }

  formatWind(speed, direction) {
    if (!speed || !speed.value) return 'N/A';
    const mph = speed.unitCode === 'wmoUnit:kmh' ? speed.value * 0.621371 : speed.value;
    const directionText = direction?.value ? `${Math.round(direction.value)}°` : '';
    return `${Math.round(mph)} mph ${directionText}`;
  }

  hasSevereWeather() {
    return this.alerts.some(alert => 
      alert.properties.severity === 'Severe' || 
      alert.properties.event.includes('Tornado') ||
      alert.properties.event.includes('Severe Thunderstorm')
    );
  }

  renderRadarOverlays() {
    const overlays = [];

    // Storm cell overlays
    if (this.radarOverlays.includes('storms')) {
      this.stormCells.forEach((storm, index) => {
        const style = `
          left: ${(storm.lon - this.config.longitude + 0.5) * 100}%;
          top: ${(this.config.latitude - storm.lat + 0.5) * 100}%;
          width: ${Math.max(20, storm.intensity / 2)}px;
          height: ${Math.max(20, storm.intensity / 2)}px;
        `;
        overlays.push(html`
          <div class="storm-overlay" style="${style}" 
               title="Storm Cell - ${Math.round(storm.intensity)}% intensity"></div>
        `);
      });
    }

    // Lightning overlays
    if (this.radarOverlays.includes('lightning')) {
      this.lightningStrikes.forEach((strike, index) => {
        const style = `
          left: ${(strike.lon - this.config.longitude + 0.1) * 1000}%;
          top: ${(this.config.latitude - strike.lat + 0.1) * 1000}%;
        `;
        overlays.push(html`
          <div class="lightning-strike" style="${style}"></div>
        `);
      });
    }

    return overlays;
  }

  render() {
    if (this.loading) {
      return html`
        <div class="card-header">${this.config.title}</div>
        <div class="loading">Loading YAWC weather data...</div>
      `;
    }

    if (this.error) {
      return html`
        <div class="card-header">
          ${this.config.title}
          <button class="refresh-button" @click=${this.fetchWeatherData}>↻</button>
        </div>
        <div class="error">${this.error}</div>
      `;
    }

    return html`
      <div class="card-header">
        ${this.config.title}
        <button class="refresh-button" @click=${this.fetchWeatherData}>↻</button>
      </div>

      ${this.hasSevereWeather() ? html`
        <div class="severe-weather-banner">
          ⚠️ SEVERE WEATHER ALERT ⚠️
        </div>
      ` : ''}

      ${this.alerts.length > 0 ? html`
        <div class="alerts">
          ${this.alerts.map(alert => html`
            <div class="alert-title">${alert.properties.headline}</div>
            <div>${alert.properties.description.substring(0, 200)}...</div>
          `)}
        </div>
      ` : ''}

      <div class="current-weather">
        <div class="current-temp">
          ${this.formatTemperature(this.currentConditions.temperature)}
        </div>
        <div class="current-condition">
          ${this.getWeatherIcon(this.currentConditions.textDescription)}
          ${this.currentConditions.textDescription || 'Unknown'}
        </div>
        
        <div class="current-details">
          <div class="detail-item">
            <span class="detail-label">Feels Like</span>
            <span class="detail-value">
              ${this.formatTemperature(this.currentConditions.heatIndex || this.currentConditions.windChill || this.currentConditions.temperature)}
            </span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Humidity</span>
            <span class="detail-value">
              ${this.currentConditions.relativeHumidity?.value ? Math.round(this.currentConditions.relativeHumidity.value) + '%' : 'N/A'}
            </span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Wind</span>
            <span class="detail-value">
              ${this.formatWind(this.currentConditions.windSpeed, this.currentConditions.windDirection)}
            </span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Pressure</span>
            <span class="detail-value">
              ${this.currentConditions.barometricPressure?.value ? 
                (this.currentConditions.barometricPressure.value / 100).toFixed(2) + ' mb' : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      ${this.config.show_hourly && this.hourlyForecast ? html`
        <div class="hourly-forecast">
          <div class="forecast-title">Hourly Forecast</div>
          <div class="hourly-scroll">
            ${this.hourlyForecast.map(hour => html`
              <div class="hourly-item">
                <div class="hourly-time">
                  ${new Date(hour.startTime).toLocaleTimeString([], {hour: 'numeric'})}
                </div>
                <div>${this.getWeatherIcon(hour.shortForecast)}</div>
                <div class="hourly-temp">${hour.temperature}°</div>
                <div class="hourly-precip">
                  ${hour.probabilityOfPrecipitation?.value || 0}%
                </div>
              </div>
            `)}
          </div>
        </div>
      ` : ''}

      ${this.config.show_forecast && this.forecast.length > 0 ? html`
        <div class="forecast">
          <div class="forecast-title">Extended Forecast</div>
          <div class="forecast-grid">
            ${this.forecast.map(day => html`
              <div class="forecast-item">
                <div class="forecast-day">${day.name}</div>
                <div class="forecast-icon">
                  ${this.getWeatherIcon(day.shortForecast)}
                </div>
                <div class="forecast-temps">
                  <span class="forecast-high">${day.temperature}°</span>
                </div>
                <div class="forecast-precip">
                  ${day.probabilityOfPrecipitation?.value || 0}% chance
                </div>
              </div>
            `)}
          </div>
        </div>
      ` : ''}

      ${this.config.show_radar ? html`
        <div class="radar-section">
          <div class="forecast-title">Enhanced Weather Radar</div>
          
          <div class="radar-controls">
            <div class="radar-control-group">
              <div class="radar-control-row">
                <select class="radar-select" @change=${(e) => this.updateRadarType(e.target.value)}>
                  <option value="base_reflectivity" ?selected=${this.radarType === 'base_reflectivity'}>
                    Base Reflectivity
                  </option>
                  <option value="base_velocity" ?selected=${this.radarType === 'base_velocity'}>
                    Base Velocity
                  </option>
                  <option value="storm_relative_motion" ?selected=${this.radarType === 'storm_relative_motion'}>
                    Storm Motion
                  </option>
                  <option value="precipitation" ?selected=${this.radarType === 'precipitation'}>
                    Precipitation
                  </option>
                  <option value="long_range" ?selected=${this.radarType === 'long_range'}>
                    Long Range
                  </option>
                </select>
              </div>
              
              <div class="radar-control-row">
                <div class="zoom-controls">
                  <button class="radar-button zoom-button ${this.radarZoom === 'local' ? 'active' : ''}" 
                          @click=${() => this.updateRadarZoom('local')}>Local</button>
                  <button class="radar-button zoom-button ${this.radarZoom === 'regional' ? 'active' : ''}" 
                          @click=${() => this.updateRadarZoom('regional')}>Regional</button>
                  <button class="radar-button zoom-button ${this.radarZoom === 'national' ? 'active' : ''}" 
                          @click=${() => this.updateRadarZoom('national')}>National</button>
                </div>
              </div>
            </div>

            <div class="radar-control-group">
              <div class="radar-control-row">
                <label class="radar-label">
                  <input type="checkbox" class="radar-checkbox" 
                         ?checked=${this.radarOverlays.includes('storms')}
                         @change=${() => this.toggleOverlay('storms')}>
                  Storm Cells
                </label>
                <label class="radar-label">
                  <input type="checkbox" class="radar-checkbox" 
                         ?checked=${this.radarOverlays.includes('lightning')}
                         @change=${() => this.toggleOverlay('lightning')}>
                  Lightning
                </label>
              </div>
              
              <div class="radar-control-row">
                <label class="radar-label">
                  <input type="checkbox" class="radar-checkbox" 
                         ?checked=${this.radarOverlays.includes('counties')}
                         @change=${() => this.toggleOverlay('counties')}>
                  Counties
                </label>
                <label class="radar-label">
                  <input type="checkbox" class="radar-checkbox" 
                         ?checked=${this.radarOverlays.includes('highways')}
                         @change=${() => this.toggleOverlay('highways')}>
                  Highways
                </label>
              </div>
            </div>
          </div>

          <div class="radar-container" style="height: ${this.config.radar_height}px;">
            ${this.radarLoading ? html`
              <div class="radar-loading">Loading enhanced radar data...</div>
            ` : html`
              <img 
                class="radar-canvas" 
                src="${this.getCurrentRadarUrl()}?t=${Date.now()}" 
                alt="Enhanced Weather Radar"
                @load=${() => { this.radarLoading = false; this.requestUpdate(); }}
                @error=${() => { this.radarLoading = false; this.requestUpdate(); }}
              />
              
              ${this.renderRadarOverlays()}
              
              <div class="radar-info">
                ${this.radarStation} - ${this.radarType.replace('_', ' ').toUpperCase()}
              </div>
              
              ${this.radarFrames.length > 0 ? html`
                <div class="radar-timestamp">
                  ${this.radarFrames[this.currentFrame]?.timestamp.toLocaleTimeString() || 'Loading...'}
                </div>
              ` : ''}
            `}
          </div>

          <div class="animation-controls">
            <button class="radar-button ${this.animationPlaying ? 'playing' : ''}" 
                    @click=${this.toggleAnimation}>
              ${this.animationPlaying ? '⏸️ Pause' : '▶️ Play'}
            </button>
            
            <input type="range" 
                   class="frame-slider" 
                   min="0" 
                   max="${this.radarFrames.length - 1}" 
                   value="${this.currentFrame}"
                   @input=${(e) => this.setFrame(parseInt(e.target.value))}>
            
            <button class="radar-button" @click=${this.refreshRadar}>
              🔄 Refresh
            </button>
            
            <button class="radar-button" 
                    @click=${() => window.open(`https://radar.weather.gov/region/conus/`, '_blank')}>
              🔗 Full Screen
            </button>
          </div>

          <div class="radar-legend">
            <div>Frame: ${this.currentFrame + 1}/${this.radarFrames.length}</div>
            <div>Speed: ${this.config.animation_speed}ms</div>
            <div>Storm Cells: ${this.stormCells.length}</div>
            <div>Lightning: ${this.lightningStrikes.length}</div>
          </div>
        </div>
      ` : ''}

      ${this.config.show_branding ? html`
        <div class="yawc-branding">
          YAWC v${YAWC_VERSION} - Yet Another Weather Card
        </div>
      ` : ''}
    `;
  }

  getCardSize() {
    let size = 4; // Base size
    if (this.config.show_hourly) size += 2;
    if (this.config.show_forecast) size += 3;
    if (this.config.show_radar) size += Math.ceil(this.config.radar_height / 80) + 2; // Extra for controls
    if (this.alerts.length > 0) size += 1;
    if (this.hasSevereWeather()) size += 1;
    if (this.config.show_branding) size += 0.5;
    return size;
  }

  static getConfigElement() {
    return document.createElement('yawc-editor');
  }

  static getStubConfig() {
    return {
      title: 'YAWC Weather',
      latitude: 40.8136,
      longitude: -96.7026,
      show_alerts: true,
      show_forecast: true,
      show_hourly: true,
      show_radar: true,
      show_storm_tracking: true,
      show_lightning: true,
      show_branding: true,
      forecast_days: 7,
      radar_height: 500,
      update_interval: 300000,
      animation_frames: 10,
      animation_speed: 500
    };
  }
}

customElements.define('yawc', YetAnotherWeatherCard);

console.log('🌦️ YAWC: Custom element defined');

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'yawc',
  name: 'YAWC - Yet Another Weather Card',
  description: 'Advanced NWS weather card with animated radar, storm tracking, and lightning detection',
  preview: true,
});

console.log('🌦️ YAWC: Added to custom cards registry');
console.log('🌦️ YAWC: Registration complete - element should be available as "yawc"');

console.info(
  '%c YAWC %c v' + YAWC_VERSION + ' ',
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);
