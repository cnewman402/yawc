# YAWC - Yet Another Weather Card

A comprehensive Home Assistant weather card featuring real-time NWS data, interactive Windy radar, live clock, and customizable display options.

## Preview

![YAWC Weather Card](path-to-your-overall-look-image.png)

*Clean, modern weather display with live updating time, current conditions, interactive radar, hourly forecast, and extended forecast*

## ✨ Key Features

- **Real-time NWS Weather Data** - Accurate forecasts from the National Weather Service
- **Interactive Windy Radar** - Pan, zoom, and explore weather layers without page refreshes  
- **Live Clock** - Updates every second for current time display
- **Weather Alerts** - Color-coded severity levels (Severe/Moderate/Minor)
- **Hourly Forecast** - 12-hour outlook with precipitation chances
- **5-Day Extended Forecast** - Daily weather patterns
- **Customizable Headers** - Show/hide section titles for cleaner layouts
- **Auto-refresh** - Configurable update intervals (default 5 minutes)
- **Responsive Design** - Mobile and desktop optimized

## 🚀 Installation

### HACS (Recommended)
1. Open HACS in Home Assistant
2. Go to "Frontend" 
3. Click the menu (⋯) and select "Custom repositories"
4. Add repository URL: `https://github.com/cnewman402/yawc`
5. Category: "Lovelace"
6. Install and restart Home Assistant

### Manual Installation
1. Download `yawc.js` from this repository
2. Copy to `/config/www/yawc/yawc.js`
3. Add to your Lovelace resources:
```yaml
resources:
  - url: /local/yawc/yawc.js
    type: module
```

## ⚙️ Configuration

### Basic Usage
```yaml
type: custom:yawc-card
title: "My Weather"
```

### Full Configuration Options

![Basic Settings](path-to-basic-settings-image.png)
![Display Options](path-to-display-options-image.png)
![Radar Settings](path-to-radar-settings-image.png)

```yaml
type: custom:yawc-card

# Basic Settings
title: "My Clean Weather"
update_interval: 300000  # 5 minutes (in milliseconds)

# Location (Optional - uses Home Assistant location by default)
latitude: 40.7128
longitude: -74.0060

# Display Options
show_radar: true
show_alerts: true
show_hourly: true
show_forecast: true
show_branding: true

# Optional Section Headers (all default to true)
show_radar_header: false      # Hide "Windy.com Interactive Radar" header
show_hourly_header: false     # Hide "12-Hour Forecast" header  
show_forecast_header: true    # Keep "5-Day Forecast" header

# Radar Configuration
radar_zoom: 7                 # Zoom level (5-10)
radar_height: 400             # Height in pixels (300-600)

# Forecast Settings
forecast_days: 5              # Number of forecast days (1-7)
```

## 📍 Location Setup

**Automatic Location**: YAWC automatically uses your Home Assistant's configured location (latitude/longitude from Settings → System → General).

**Manual Override**: Optionally specify custom coordinates in the card configuration for different locations.

![Location Settings](path-to-location-settings-image.png)

## 🎛️ Configuration Options

### Basic Settings
- **Card Title**: Custom name for your weather card
- **Update Interval**: How often to refresh weather data (1-60 minutes)

### Display Options  
- **Show Windy Radar**: Interactive weather radar with multiple layers
- **Show Weather Alerts**: NWS alerts with color-coded severity
- **Show Hourly Forecast**: 12-hour detailed forecast
- **Show Extended Forecast**: Multi-day weather outlook
- **Show YAWC Branding**: Display version info in footer

### Section Headers
Customize which section headers are displayed for a cleaner look:
- **Radar Header**: "Windy.com Interactive Radar" 
- **Hourly Header**: "12-Hour Forecast"
- **Forecast Header**: "X-Day Forecast"

### Radar Settings
- **Zoom Level**: Map zoom from 5 (wide view) to 10 (close view)
- **Radar Height**: Display height in pixels (300-600px)

### Forecast Settings  
- **Forecast Days**: Number of days to show (1-7)

## 🌦️ Weather Data Sources

- **Current Conditions**: National Weather Service observation stations
- **Forecasts**: NWS forecast grids
- **Weather Alerts**: NWS active alerts by location
- **Radar**: Windy.com interactive weather radar

## 🔧 Troubleshooting

### Weather Data Not Loading
- Verify your Home Assistant location is set in Settings → System → General
- Check that your location is within NWS coverage area (US territories)
- Review Home Assistant logs for API errors

### Radar Not Displaying  
- Check your internet connection
- Ensure iframe loading is not blocked by browser/network
- Try adjusting radar height setting

### Card Not Updating
- Verify update_interval is set correctly (in milliseconds)
- Check Home Assistant resource configuration
- Clear browser cache and hard refresh (Ctrl+Shift+R)

## 🎨 Customization

The card automatically adapts to your Home Assistant theme variables:
- `--card-background-color`
- `--primary-text-color` 
- `--secondary-text-color`
- `--divider-color`
- `--secondary-background-color`

## 📱 Mobile Support

YAWC is fully responsive and optimized for mobile devices:
- Stacked layout on narrow screens
- Touch-friendly radar controls
- Readable font sizes on all devices

## 🤝 Contributing

Issues and pull requests welcome! Please check existing issues before submitting new ones.

## 📄 License

This project is licensed under the MIT License.

## 🙋‍♂️ Support

- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Ask questions in GitHub Discussions
- **Home Assistant Community**: [YAWC Thread](link-to-community-thread)

---

**YAWC v3.2** - Built with ❤️ for the Home Assistant community
