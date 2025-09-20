# YAWC - Yet Another Weather Card

[![GitHub Release][releases-shield]][releases]
[![License][license-shield]](LICENSE)
[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg?style=for-the-badge)](https://github.com/custom-components/hacs)

A comprehensive weather card for Home Assistant featuring enhanced NWS (National Weather Service) integration with animated radar, storm tracking, and lightning detection.

![YAWC Preview](https://via.placeholder.com/600x400/2c2c2c/ffffff?text=YAWC+Weather+Card+Preview)

## ✨ Features

### 🌦️ **Complete Weather Information**
- **Current Conditions**: Temperature, humidity, wind, pressure, feels-like temperature
- **Hourly Forecast**: Next 12 hours with temperatures and precipitation probability
- **Extended Forecast**: 7-day detailed weather outlook
- **Weather Alerts**: Real-time severe weather warnings and watches

### 📡 **Advanced Radar System**
- **Animated Radar Loop**: 10-frame animation showing storm movement
- **Multiple Radar Types**: Base reflectivity, velocity, storm motion, precipitation, long-range
- **Zoom Levels**: Local, regional, and national radar views
- **Interactive Controls**: Play/pause, frame scrubbing, refresh

### ⛈️ **Storm Intelligence**
- **Storm Cell Tracking**: Visual indicators for severe weather systems
- **Lightning Detection**: Real-time lightning strike visualization
- **Severe Weather Alerts**: Prominent alerts with pulsing animations
- **Geographic Overlays**: Counties, highways, and reference points

### 🎛️ **Customization Options**
- **Flexible Display**: Show/hide any section (alerts, forecast, radar, etc.)
- **Configurable Updates**: Adjustable refresh intervals
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Theme Integration**: Matches Home Assistant's design system

## 🚀 Installation

### HACS (Recommended)

1. Open HACS in your Home Assistant instance
2. Click on "Frontend" 
3. Click the menu (three dots) in the top right
4. Select "Custom repositories"
5. Add this repository URL: `https://github.com/yourusername/yawc`
6. Select category "Lovelace"
7. Click "Install"
8. Add the resource to your `configuration.yaml`:

```yaml
lovelace:
  resources:
    - url: /hacsfiles/yawc/yawc.js
      type: module
```

### Manual Installation

1. Download `yawc.js` from the latest release
2. Copy it to your `www` folder in your Home Assistant config directory
3. Add the resource to your `configuration.yaml`:

```yaml
lovelace:
  resources:
    - url: /local/yawc.js
      type: module
```

4. Restart Home Assistant

## ⚙️ Configuration

### Basic Configuration

```yaml
type: custom:yawc-card
title: "My Weather"
latitude: 40.7128
longitude: -74.0060
```

### Full Configuration

```yaml
type: custom:yawc-card
title: "Enhanced Weather"
latitude: 40.7128
longitude: -74.0060

# Display Options
show_alerts: true
show_forecast: true
show_hourly: true
show_radar: true
show_storm_tracking: true
show_lightning: true
show_branding: true

# Forecast Settings
forecast_days: 7

# Radar Settings
radar_height: 500
animation_frames: 10
animation_speed: 500

# Update Settings
update_interval: 300000  # 5 minutes in milliseconds
```

## 📋 Configuration Options

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `title` | string | `YAWC Weather` | Card title |
| `latitude` | number | **Required** | Your latitude |
| `longitude` | number | **Required** | Your longitude |
| `show_alerts` | boolean | `true` | Show weather alerts |
| `show_forecast` | boolean | `true` | Show extended forecast |
| `show_hourly` | boolean | `true` | Show hourly forecast |
| `show_radar` | boolean | `true` | Show radar section |
| `show_storm_tracking` | boolean | `true` | Show storm cell overlays |
| `show_lightning` | boolean | `true` | Show lightning strikes |
| `show_branding` | boolean | `true` | Show YAWC branding |
| `forecast_days` | number | `5` | Number of forecast days (1-7) |
| `radar_height` | number | `500` | Radar display height in pixels |
| `update_interval` | number | `300000` | Update frequency in milliseconds |
| `animation_frames` | number | `10` | Number of radar animation frames |
| `animation_speed` | number | `500` | Animation speed in milliseconds |

## 🎯 Radar Features

### Radar Types
- **Base Reflectivity**: Standard precipitation radar showing rain/snow intensity
- **Base Velocity**: Wind patterns and storm rotation detection  
- **Storm Relative Motion**: Storm movement and development tracking
- **Precipitation**: Rainfall rate estimates and accumulation
- **Long Range**: Extended coverage area view

### Zoom Levels
- **Local**: High-resolution view of immediate area (~50 mile radius)
- **Regional**: Broader coverage of surrounding states (~200 mile radius)  
- **National**: Continental US overview for weather pattern context

### Overlays
- **Storm Cells**: Red pulsing indicators showing severe weather locations
- **Lightning**: Yellow flashing dots for recent lightning activity
- **Counties**: Geographic boundary reference lines
- **Highways**: Major road overlays for navigation context

## 🌟 Advanced Features

### Storm Intelligence
YAWC automatically detects and highlights severe weather:
- Storm cells are shown as animated red circles with intensity indicators
- Lightning strikes appear as flashing yellow dots
- Severe weather triggers prominent alert banners
- Real-time storm movement tracking

### Animation System
- **10-frame loop** showing the last 50 minutes of radar data
- **Play/pause controls** with smooth animation
- **Frame scrubbing** to examine specific time periods
- **Automatic updates** every 5 minutes

### Alert Integration
- Integrates with NWS alert system
- Color-coded severity levels
- Animated alerts for severe weather
- Detailed alert descriptions and instructions

## 🔧 Troubleshooting

### Common Issues

**Card not loading:**
- Verify the resource is added to your configuration
- Check browser console for JavaScript errors
- Ensure latitude/longitude are valid numbers

**No radar data:**
- Check internet connectivity
- Verify coordinates are within US/territories
- Some radar stations may have temporary outages

**Slow performance:**
- Reduce `animation_frames` (try 5-6 instead of 10)
- Increase `update_interval` to reduce API calls
- Lower `radar_height` for better mobile performance

### Location Requirements
- YAWC uses NWS APIs which cover:
  - Continental United States
  - Alaska and Hawaii  
  - US Territories (Puerto Rico, Guam, etc.)
- International locations are not supported

## 🛠️ Development

### Local Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/yawc.git
cd yawc

# Install dependencies (if any)
npm install

# Link to Home Assistant for testing
ln -s $(pwd)/yawc.js /path/to/homeassistant/www/
```

### Building

No build process required - YAWC is a single JavaScript file using native ES modules.

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b my-new-feature`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -am 'Add some feature'`
5. Push to the branch: `git push origin my-new-feature`
6. Submit a pull request

## 📊 API Usage

YAWC responsibly uses the following NWS APIs:
- **Points API**: Location and grid information
- **Observations API**: Current weather conditions
- **Forecast API**: Extended weather forecasts
- **Alerts API**: Weather warnings and watches
- **Radar API**: NEXRAD radar imagery

All APIs are public and free. YAWC implements appropriate caching and rate limiting.

## 🔒 Privacy

YAWC:
- Only uses your provided coordinates to fetch weather data
- Makes direct API calls to NWS (no third-party services)
- Does not store or transmit personal information
- Operates entirely within your Home Assistant instance

## 📱 Browser Compatibility

YAWC works with modern browsers supporting:
- ES6 modules
- CSS Grid and Flexbox
- Fetch API
- Web Components (Lit Element)

**Supported Browsers:**
- Chrome 61+
- Firefox 60+
- Safari 12+
- Edge 79+

## 🆘 Support

### Getting Help
- Check the [Issues](https://github.com/yourusername/yawc/issues) page
- Search existing issues before creating new ones
- Provide your configuration and any error messages
- Include Home Assistant and browser versions

### Feature Requests
We welcome feature requests! Please:
- Check if the feature already exists
- Explain your use case clearly
- Consider contributing if you have development skills

## 📄 Changelog

### Version 1.0.0
- Initial release
- Full NWS API integration
- Animated radar with multiple types
- Storm tracking and lightning detection
- Responsive design
- HACS compatibility

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **National Weather Service** for providing excellent free APIs
- **Home Assistant Community** for inspiration and feedback
- **Lit Element** for the web component framework
- **HACS** for making custom component distribution easy

## 🏷️ Keywords

weather, radar, nws, national weather service, home assistant, lovelace, card, lightning, storms, forecast, animated radar, severe weather

---

**Made with ❤️ for the Home Assistant community**

[releases-shield]: https://img.shields.io/github/release/yourusername/yawc.svg?style=for-the-badge
[releases]: https://github.com/yourusername/yawc/releases
[license-shield]: https://img.shields.io/github/license/yourusername/yawc.svg?style=for-the-badge
