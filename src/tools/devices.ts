import { queryFeatureServer, ENDPOINTS } from '../api.js';
import { getAqiLabel, haversineDistance, formatDevice, formatDeviceSummary, sanitizeId } from '../utils.js';
import type { DeviceAttributes } from '../types.js';

// Fields needed by formatDevice() — avoids fetching irrelevant server-side columns.
const DEVICE_FULL_FIELDS = [
  'code', 'locationlatitude', 'locationlongitude',
  'pm2_5concmassnowcastusepaaqi_va', 'pm2_5concmass1hourmean_value', 'pm10concmass1hourmean_value',
  'no2conc1hourmean_value', 'o3conc1hourmean_value', 'temperatureinternal1hourmean_va',
  'relhumidinternal1hourmean_value', 'windspeed1hourmean_value', 'winddirection1hourmean_value',
  'overallstatus', 'lifestage',
].join(',');

export const getAllDevices = async (params: { limit: number; onlyWorking: boolean }) => {
  const where = params.onlyWorking ? "overallstatus='healthy'" : '1=1';

  const data = await queryFeatureServer(ENDPOINTS.devices, {
    where,
    outFields: 'code,locationlatitude,locationlongitude,pm2_5concmassnowcastusepaaqi_va,overallstatus,lifestage',
    resultRecordCount: params.limit,
    orderByFields: 'pm2_5concmassnowcastusepaaqi_va DESC',
  });

  let aqiSum = 0;
  let aqiCount = 0;

  const devices = (data.features ?? []).map(f => {
    const a = f.attributes as DeviceAttributes;
    const aqi = a.pm2_5concmassnowcastusepaaqi_va;
    if (aqi != null && !isNaN(aqi)) { aqiSum += aqi; aqiCount++; }
    return formatDeviceSummary(a);
  });

  const cityAvgAqi = aqiCount > 0 ? Math.round(aqiSum / aqiCount) : null;

  return { deviceCount: devices.length, cityAverageAqi: cityAvgAqi, cityAqiLabel: getAqiLabel(cityAvgAqi), devices };
}

export const getDeviceCurrent = async (params: { code: string }) => {
  const data = await queryFeatureServer(ENDPOINTS.devices, {
    where: `code='${sanitizeId(params.code)}'`,
    outFields: DEVICE_FULL_FIELDS,
    resultRecordCount: 1,
  });

  const feature = data.features?.[0];
  if (!feature) throw new Error(`Device '${params.code}' not found`);
  return formatDevice(feature.attributes as DeviceAttributes);
}

export const getDevicesByAqi = async (params: { threshold: number; above: boolean; limit: number }) => {
  const op    = params.above ? '>=' : '<=';
  const order = params.above
    ? 'pm2_5concmassnowcastusepaaqi_va DESC'
    : 'pm2_5concmassnowcastusepaaqi_va ASC';
  const where =
    `pm2_5concmassnowcastusepaaqi_va ${op} ${params.threshold} AND pm2_5concmassnowcastusepaaqi_va IS NOT NULL`;

  const data = await queryFeatureServer(ENDPOINTS.devices, {
    where,
    outFields: 'code,locationlatitude,locationlongitude,pm2_5concmassnowcastusepaaqi_va,overallstatus',
    resultRecordCount: params.limit,
    orderByFields: order,
  });

  return {
    threshold: params.threshold,
    above: params.above,
    count: (data.features ?? []).length,
    devices: (data.features ?? []).map(f => formatDeviceSummary(f.attributes as DeviceAttributes)),
  };
}

export const getNearestSensor = async (params: { lat: number; lon: number }) => {
  // Stage 1: fetch only coordinates to find the nearest device code.
  const coordData = await queryFeatureServer(ENDPOINTS.devices, {
    where: "overallstatus='healthy'",
    outFields: 'code,locationlatitude,locationlongitude',
    resultRecordCount: 1000,
  });

  const features = coordData.features ?? [];
  if (!features.length) throw new Error('No working devices found');

  let nearestCode: string | null = null;
  let minDist = Infinity;

  for (const f of features) {
    const a = f.attributes as Pick<DeviceAttributes, 'code' | 'locationlatitude' | 'locationlongitude'>;
    if (a.locationlatitude == null || a.locationlongitude == null) continue;
    const dist = haversineDistance(params.lat, params.lon, a.locationlatitude, a.locationlongitude);
    if (dist < minDist) { minDist = dist; nearestCode = a.code; }
  }

  if (!nearestCode) throw new Error('No devices with valid coordinates found');

  // Stage 2: fetch the full reading for the nearest device.
  const reading = await getDeviceCurrent({ code: nearestCode });
  return { distanceKm: Math.round(minDist * 100) / 100, ...reading };
}
