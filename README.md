# 📍yerevan-aqi-mcp

MCP server for real-time Yerevan city air quality data. Connects AI assistants directly to the [official Yerevan GIS platform](https://gis.yerevan.am) — no API key required.

https://github.com/user-attachments/assets/757580fc-1061-4cb4-9c76-6526ccb19d80

## ✨ Features

- **Real-time AQI** from 50+ sensors across the city
- **Historical data** — hourly records, daily trends, worst locations
- **Zero auth** — open municipal data, just works
- **8 tools** covering everything from nearest sensor lookup to city-wide averages

## 📦 Installation

**Via npx (recommended):**
```json
{
  "mcpServers": {
    "yerevan-aqi": {
      "command": "npx",
      "args": ["yerevan-aqi-mcp"]
    }
  }
}
```

**From source:**
```bash
git clone https://github.com/hayrapetian/yerevan-aqi-mcp
cd yerevan-aqi-mcp
npm install && npm run build
```
```json
{
  "mcpServers": {
    "yerevan-aqi": {
      "command": "node",
      "args": ["/absolute/path/to/yerevan-aqi-mcp/dist/index.js"]
    }
  }
}
```

Config file location:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

## 🛠️ Tools

### `get_all_devices`
All sensors with current AQI and coordinates. Also returns city-wide average AQI.

| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | int | 50 | Max devices to return (max 200) |
| `onlyWorking` | bool | true | Filter to operational devices only |

### `get_device_current`
Full current reading for a specific sensor: AQI, PM2.5, PM10, NO2, O3, temperature, humidity, wind.

| Param | Type | Description |
|---|---|---|
| `code` | string | Device code identifier |

### `get_devices_by_aqi`
Devices filtered above or below an AQI threshold, ordered by AQI.

| Param | Type | Default | Description |
|---|---|---|---|
| `threshold` | int | 100 | AQI threshold |
| `above` | bool | true | `true` = above, `false` = below |
| `limit` | int | 20 | Max results (max 100) |

### `get_nearest_sensor`
Closest working sensor to a given coordinate with its current reading.

| Param | Type | Description |
|---|---|---|
| `lat` | float | Latitude |
| `lon` | float | Longitude |

### `get_device_history`
Hourly records for a specific sensor over N days, with min/max/avg summary.

| Param | Type | Default | Description |
|---|---|---|---|
| `code` | string | — | Device code identifier |
| `days` | int | 7 | Days back (max 30) |

### `get_city_average`
City-wide aggregate AQI, PM2.5, and PM10 — averages and maxima — computed server-side.

| Param | Type | Default | Description |
|---|---|---|---|
| `days` | int | 1 | Days back to aggregate (max 30) |

### `get_worst_locations`
Top N most polluted sensors in a time window, ranked by average AQI.

| Param | Type | Default | Description |
|---|---|---|---|
| `hours` | int | 24 | Hours back (max 168) |
| `limit` | int | 10 | Number of results (max 50) |

### `get_historical_trend`
Daily average PM2.5 AQI and PM10 from the 2024–2025 archive dataset.

| Param | Type | Default | Description |
|---|---|---|---|
| `deviceCode` | string | — | Filter to a specific device (optional) |
| `limit` | int | 30 | Days to return (max 365) |

## 📊 AQI Scale

| AQI | Category |
|---|---|
| 0–50 | 🟢 Good |
| 51–100 | 🟡 Moderate |
| 101–150 | 🟠 Unhealthy for Sensitive Groups |
| 151–200 | 🔴 Unhealthy |
| 201–300 | 🟣 Very Unhealthy |
| 301+ | 🔴 Hazardous |

## 💻 Development

```bash
npm run dev    # run with tsx, no build needed
npm run build  # compile TypeScript to dist/
npm start      # run compiled output
```

## 📄 License

MIT — [Hayk Hayrapetyan](https://github.com/hayrapetian)
