import { queryFeatureServer, ENDPOINTS } from '../api.js';
import { getAqiLabel, roundToOneDecimal, mean, sanitizeId } from '../utils.js';
import type { ArchiveAttributes } from '../types.js';

// Archive 2024-2025 uses truncated field names:
// pm2_5con_6 = PM2.5 NowCast AQI
// pm10concma = PM10 mass concentration µg/m³  (pm10conc_3 is a string field — useless)

const MAX_FETCH = 2000;

export const getHistoricalTrend = async (params: { deviceCode?: string; limit: number }) => {
  const whereParts: string[] = [];
  if (params.deviceCode) whereParts.push(`sourceid='${sanitizeId(params.deviceCode)}'`);

  // Fetch enough raw records to build `limit` daily averages (assuming hourly data).
  // Cap at MAX_FETCH — callers requesting many days may receive fewer than `limit` days back.
  const fetchCount = Math.min(params.limit * 24, MAX_FETCH);
  const truncated  = params.limit * 24 > MAX_FETCH;

  const data = await queryFeatureServer(ENDPOINTS.archive, {
    where:             whereParts.length ? whereParts.join(' AND ') : '1=1',
    outFields:         'sourceid,pm2_5con_6,pm10concma,startofper',
    orderByFields:     'startofper DESC',
    resultRecordCount: fetchCount,
  });

  const features = data.features ?? [];

  // Group by calendar day
  const byDay = new Map<string, { pm25Aqi: number[]; pm10: number[]; devices: Set<string> }>();

  for (const f of features) {
    const a = f.attributes as ArchiveAttributes;
    if (!a.startofper) continue;

    const day = new Date(a.startofper).toISOString().slice(0, 10);
    let bucket = byDay.get(day);
    if (!bucket) { bucket = { pm25Aqi: [], pm10: [], devices: new Set() }; byDay.set(day, bucket); }
    if (a.pm2_5con_6 != null) bucket.pm25Aqi.push(a.pm2_5con_6);
    if (a.pm10concma != null) bucket.pm10.push(a.pm10concma);
    if (a.sourceid)            bucket.devices.add(a.sourceid);
  }

  const days = [...byDay.entries()]
    .slice(0, params.limit)
    .map(([date, d]) => {
      const avgPm25Aqi = d.pm25Aqi.length ? Math.round(mean(d.pm25Aqi)!) : null;
      return {
        date,
        avgPm25Aqi,
        aqiLabel: getAqiLabel(avgPm25Aqi),
        avgPm10:  d.pm10.length ? roundToOneDecimal(mean(d.pm10)) : null,
        deviceCount: d.devices.size,
      };
    });

  return {
    deviceCode: params.deviceCode ?? 'all',
    truncated,
    days,
  };
}
