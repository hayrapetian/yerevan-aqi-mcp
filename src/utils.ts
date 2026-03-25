import type { DeviceAttributes, DeviceReading } from './types.js';

export const getAqiLabel = (aqi: number | null | undefined): string => {
  if (aqi == null || isNaN(aqi)) return 'Unknown';
  if (aqi <= 50)  return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

/** Round to one decimal place, preserving null. */
export const roundToOneDecimal = (v: number | null | undefined): number | null => {
  return v != null ? Math.round(v * 10) / 10 : null;
}

/** Haversine distance in kilometres between two lat/lon points. */
export const haversineDistance = (
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number => {
  const R = 6371;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Lightweight device summary (list views). */
export const formatDeviceSummary = (a: DeviceAttributes) => {
  return {
    code:     a.code,
    lat:      a.locationlatitude,
    lon:      a.locationlongitude,
    aqi:      a.pm2_5concmassnowcastusepaaqi_va,
    aqiLabel: getAqiLabel(a.pm2_5concmassnowcastusepaaqi_va),
    status:   a.overallstatus,
  };
}

// Some fields arrive as "" or a numeric string (e.g. "0.0", "56.22") instead of a number.
export const asNum = (v: unknown): number | null => {
  if (v == null || v === '') return null;
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return isNaN(n) ? null : n;
}

/** Full device reading (detail views). */
export const formatDevice = (a: DeviceAttributes): DeviceReading => {
  return {
    code:     a.code,
    location: { lat: a.locationlatitude, lon: a.locationlongitude },
    aqi:      a.pm2_5concmassnowcastusepaaqi_va,
    aqiLabel: getAqiLabel(a.pm2_5concmassnowcastusepaaqi_va),
    pm25:     asNum(a.pm2_5concmass1hourmean_value),
    pm10:     asNum(a.pm10concmass1hourmean_value),
    no2:      asNum(a.no2conc1hourmean_value),
    o3:       asNum(a.o3conc1hourmean_value),
    temperature: asNum(a.temperatureinternal1hourmean_va),
    humidity:    asNum(a.relhumidinternal1hourmean_value),
    wind: {
      speed:     asNum(a.windspeed1hourmean_value),
      direction: asNum(a.winddirection1hourmean_value),
    },
    status:    a.overallstatus,
    lifestage: a.lifestage,
  };
}

/** Arithmetic mean of a non-empty number array, or null. */
export const mean = (arr: number[]): number | null => {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
}

/** Escape single quotes in a device ID to prevent ESRI WHERE clause injection. */
export const sanitizeId = (id: string): string => {
  return id.replace(/'/g, "''");
}
