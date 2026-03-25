#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { getAllDevices, getDeviceCurrent, getDevicesByAqi, getNearestSensor } from './tools/devices.js';
import { getDeviceHistory, getCityAverage, getWorstLocations } from './tools/history.js';
import { getHistoricalTrend } from './tools/archive.js';

const server = new McpServer({ name: 'yerevan-aqi', version: '1.0.0' });

server.registerTool(
  'get_all_devices',
  {
    description: 'All air quality sensors with current AQI and coordinates. Returns city-wide average AQI.',
    inputSchema: {
      limit:       z.number().int().min(1).max(200).default(50).describe('Max devices to return'),
      onlyWorking: z.boolean().default(true).describe('Filter to operational devices only'),
    },
  },
  async ({ limit, onlyWorking }) => ({
    content: [{ type: 'text', text: JSON.stringify(await getAllDevices({ limit, onlyWorking }), null, 2) }],
  }),
);

server.registerTool(
  'get_device_current',
  {
    description: 'Full current reading for a specific sensor: AQI, PM2.5, PM10, NO2, O3, temperature, humidity, wind.',
    inputSchema: { code: z.string().regex(/^[\w\-]+$/).max(64).describe('Device code identifier') },
  },
  async ({ code }) => ({
    content: [{ type: 'text', text: JSON.stringify(await getDeviceCurrent({ code }), null, 2) }],
  }),
);

server.registerTool(
  'get_devices_by_aqi',
  {
    description: 'Devices filtered above or below an AQI threshold, ordered by AQI.',
    inputSchema: {
      threshold: z.number().int().min(0).max(500).default(100).describe('AQI threshold value'),
      above:     z.boolean().default(true).describe('true = above threshold, false = below'),
      limit:     z.number().int().min(1).max(100).default(20).describe('Max results'),
    },
  },
  async ({ threshold, above, limit }) => ({
    content: [{ type: 'text', text: JSON.stringify(await getDevicesByAqi({ threshold, above, limit }), null, 2) }],
  }),
);

server.registerTool(
  'get_nearest_sensor',
  {
    description: 'Given latitude/longitude, find the closest working sensor and return its current reading.',
    inputSchema: {
      lat: z.number().describe('Latitude'),
      lon: z.number().describe('Longitude'),
    },
  },
  async ({ lat, lon }) => ({
    content: [{ type: 'text', text: JSON.stringify(await getNearestSensor({ lat, lon }), null, 2) }],
  }),
);

server.registerTool(
  'get_device_history',
  {
    description: 'Hourly records for a specific sensor over N days. Returns records plus min/max/avg summary.',
    inputSchema: {
      code: z.string().regex(/^[\w\-]+$/).max(64).describe('Device code identifier'),
      days: z.number().int().min(1).max(30).default(7).describe('Number of days back'),
    },
  },
  async ({ code, days }) => ({
    content: [{ type: 'text', text: JSON.stringify(await getDeviceHistory({ code, days }), null, 2) }],
  }),
);

server.registerTool(
  'get_city_average',
  {
    description: 'City-wide aggregate AQI, PM2.5, PM10 — averages and maxima — computed server-side via outStatistics.',
    inputSchema: { days: z.number().int().min(1).max(30).default(1).describe('Days back to aggregate') },
  },
  async ({ days }) => ({
    content: [{ type: 'text', text: JSON.stringify(await getCityAverage({ days }), null, 2) }],
  }),
);

server.registerTool(
  'get_worst_locations',
  {
    description: 'Top N most polluted sensors in a recent time window, ranked by average AQI.',
    inputSchema: {
      hours: z.number().int().min(1).max(168).default(24).describe('Hours back to consider'),
      limit: z.number().int().min(1).max(50).default(10).describe('Number of results'),
    },
  },
  async ({ hours, limit }) => ({
    content: [{ type: 'text', text: JSON.stringify(await getWorstLocations({ hours, limit }), null, 2) }],
  }),
);

server.registerTool(
  'get_historical_trend',
  {
    description: 'Daily averages from the 2024–2025 archive. Uses truncated field names (pm2_5con_6 = NowCast AQI, pm10concma = PM10 µg/m³).',
    inputSchema: {
      deviceCode: z.string().regex(/^[\w\-]+$/).max(64).optional().describe('Filter to a specific device (optional)'),
      limit:      z.number().int().min(1).max(365).default(30).describe('Number of days to return'),
    },
  },
  async ({ deviceCode, limit }) => ({
    content: [{ type: 'text', text: JSON.stringify(await getHistoricalTrend({ deviceCode, limit }), null, 2) }],
  }),
);

await server.connect(new StdioServerTransport());
