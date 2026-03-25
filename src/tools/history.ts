import { queryFeatureServer, ENDPOINTS } from '../api.js';
import { getAqiLabel, roundToOneDecimal, sanitizeId, asNum } from '../utils.js';
import type { HistoryRecord, StatRecord } from '../types.js';

const HISTORY_FIELDS = [
  'sourceid',
  'startofperiod_date',
  'pm2_5concmassnowcastusepaaqi_va',
  'pm2_5concmass1hourmean_value',
  'pm10concmass1hourmean_raw',
  'no2conc1hourmean_value',
  'o3conc1hourmean_value',
].join(',');

// Pre-built outStatistics payloads — static, no need to re-stringify per call.
const CITY_AVG_STATISTICS = JSON.stringify([
  { statisticType: 'avg', onStatisticField: 'pm2_5concmassnowcastusepaaqi_va', outStatisticFieldName: 'avg_aqi'  },
  { statisticType: 'max', onStatisticField: 'pm2_5concmassnowcastusepaaqi_va', outStatisticFieldName: 'max_aqi'  },
  { statisticType: 'avg', onStatisticField: 'pm2_5concmass1hourmean_value',    outStatisticFieldName: 'avg_pm25' },
  { statisticType: 'max', onStatisticField: 'pm2_5concmass1hourmean_value',    outStatisticFieldName: 'max_pm25' },
  { statisticType: 'avg', onStatisticField: 'pm10concmass1hourmean_raw',        outStatisticFieldName: 'avg_pm10' },
  { statisticType: 'max', onStatisticField: 'pm10concmass1hourmean_raw',        outStatisticFieldName: 'max_pm10' },
]);

const WORST_LOCATIONS_STATISTICS = JSON.stringify([
  { statisticType: 'avg',   onStatisticField: 'pm2_5concmassnowcastusepaaqi_va', outStatisticFieldName: 'avg_aqi'      },
  { statisticType: 'max',   onStatisticField: 'pm2_5concmassnowcastusepaaqi_va', outStatisticFieldName: 'max_aqi'      },
  { statisticType: 'avg',   onStatisticField: 'pm2_5concmass1hourmean_value',    outStatisticFieldName: 'avg_pm25'     },
  { statisticType: 'count', onStatisticField: 'sourceid',                        outStatisticFieldName: 'record_count' },
]);

const toEsriTimestamp = (epochMs: number): string => {
  return new Date(epochMs).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
}

export const getDeviceHistory = async (params: { code: string; days: number }) => {
  const anchor    = await getLatestHistoryDate();
  const startTime = anchor - params.days * 24 * 60 * 60 * 1000;
  const where = `sourceid='${sanitizeId(params.code)}' AND startofperiod_date >= timestamp '${toEsriTimestamp(startTime)}'`;

  const records: HistoryRecord[] = [];
  let offset = 0, pages = 0;
  let hitPageLimit = false;
  const pageSize = 1000;
  const MAX_PAGES = 50;

  while (pages++ < MAX_PAGES) {
    const data = await queryFeatureServer(ENDPOINTS.history, {
      where,
      outFields:         HISTORY_FIELDS,
      orderByFields:     'startofperiod_date DESC',
      resultRecordCount: pageSize,
      resultOffset:      offset,
    });

    const features = data.features ?? [];
    records.push(...features.map(f => f.attributes as HistoryRecord));

    if (features.length < pageSize || !data.exceededTransferLimit) break;
    offset += pageSize;
    if (pages >= MAX_PAGES) hitPageLimit = true;
  }

  // Deduplicate by startofperiod_date — the API occasionally emits 2-3 copies of the same hour.
  const seen = new Set<number>();
  const unique = records.filter(r => {
    if (r.startofperiod_date == null) return true;
    if (seen.has(r.startofperiod_date)) return false;
    seen.add(r.startofperiod_date);
    return true;
  });

  // Single pass over records to collect all stats.
  let aqiSum = 0, aqiCount = 0, aqiMin = Infinity, aqiMax = -Infinity;
  let pm25Sum = 0, pm25Count = 0, pm25Min = Infinity, pm25Max = -Infinity;

  for (const r of unique) {
    const aqi = r.pm2_5concmassnowcastusepaaqi_va;
    if (aqi != null && !isNaN(aqi)) {
      aqiSum += aqi; aqiCount++;
      if (aqi < aqiMin) aqiMin = aqi;
      if (aqi > aqiMax) aqiMax = aqi;
    }
    const pm25 = r.pm2_5concmass1hourmean_value;
    if (pm25 != null && !isNaN(pm25)) {
      pm25Sum += pm25; pm25Count++;
      if (pm25 < pm25Min) pm25Min = pm25;
      if (pm25 > pm25Max) pm25Max = pm25;
    }
  }

  const avgAqi = aqiCount > 0 ? Math.round(aqiSum / aqiCount) : null;

  return {
    deviceCode:  params.code,
    days:        params.days,
    recordCount: unique.length,
    truncated:   hitPageLimit,
    summary: {
      aqi: {
        avg:   avgAqi,
        min:   aqiCount  > 0 ? aqiMin  : null,
        max:   aqiCount  > 0 ? aqiMax  : null,
        label: getAqiLabel(avgAqi),
      },
      pm25: {
        avg: pm25Count > 0 ? roundToOneDecimal(pm25Sum / pm25Count) : null,
        min: pm25Count > 0 ? pm25Min : null,
        max: pm25Count > 0 ? pm25Max : null,
      },
    },
    records: unique.map(r => ({
      periodStart: r.startofperiod_date ? new Date(r.startofperiod_date).toISOString() : null,
      aqi:  r.pm2_5concmassnowcastusepaaqi_va,
      pm25: r.pm2_5concmass1hourmean_value,
      pm10: r.pm10concmass1hourmean_raw,
      no2:  asNum(r.no2conc1hourmean_value),
      o3:   asNum(r.o3conc1hourmean_value),
    })),
  };
}

const getLatestHistoryDate = async (): Promise<number> => {
  const data = await queryFeatureServer(ENDPOINTS.history, {
    where:         '1=1',
    outStatistics: JSON.stringify([{ statisticType: 'max', onStatisticField: 'startofperiod_date', outStatisticFieldName: 'latest' }]),
  });
  return (data.features?.[0]?.attributes as { latest: number } | undefined)?.latest ?? Date.now();
}

export const getCityAverage = async (params: { days: number }) => {
  const anchor    = await getLatestHistoryDate();
  const startTime = anchor - params.days * 24 * 60 * 60 * 1000;

  // Cap values at physically plausible limits to exclude malfunctioning sensors
  // from polluting city-wide max aggregates (EPA AQI scale tops at 500).
  const where = [
    `startofperiod_date >= timestamp '${toEsriTimestamp(startTime)}'`,
    `pm2_5concmassnowcastusepaaqi_va <= 500`,
    `pm2_5concmass1hourmean_value <= 500`,
    `pm10concmass1hourmean_raw <= 600`,
  ].join(' AND ');

  const data = await queryFeatureServer(ENDPOINTS.history, {
    where,
    outStatistics: CITY_AVG_STATISTICS,
  });

  const s = (data.features?.[0]?.attributes ?? {}) as StatRecord;
  const avgAqi = s.avg_aqi != null ? Math.round(s.avg_aqi) : null;

  return {
    days:        params.days,
    periodStart: new Date(startTime).toISOString(),
    periodEnd:   new Date(anchor).toISOString(),
    aqi:  { avg: avgAqi, max: s.max_aqi  != null ? Math.round(s.max_aqi) : null, label: getAqiLabel(avgAqi) },
    pm25: { avg: roundToOneDecimal(s.avg_pm25), max: roundToOneDecimal(s.max_pm25) },
    pm10: { avg: roundToOneDecimal(s.avg_pm10), max: roundToOneDecimal(s.max_pm10) },
  };
}

export const getWorstLocations = async (params: { hours: number; limit: number }) => {
  const anchor    = await getLatestHistoryDate();
  const startTime = anchor - params.hours * 60 * 60 * 1000;

  const data = await queryFeatureServer(ENDPOINTS.history, {
    where:                      `startofperiod_date >= timestamp '${toEsriTimestamp(startTime)}'`,
    outStatistics:              WORST_LOCATIONS_STATISTICS,
    groupByFieldsForStatistics: 'sourceid',
    orderByFields:              'avg_aqi DESC',
    resultRecordCount:          params.limit,
  });

  return {
    hours:       params.hours,
    periodStart: new Date(startTime).toISOString(),
    locations: (data.features ?? []).map(f => {
      const a = f.attributes as StatRecord;
      const avgAqi = a.avg_aqi != null ? Math.round(a.avg_aqi) : null;
      return {
        deviceCode:  a.sourceid,
        avgAqi,
        maxAqi:      a.max_aqi != null ? Math.round(a.max_aqi) : null,
        avgPm25:     roundToOneDecimal(a.avg_pm25),
        aqiLabel:    getAqiLabel(avgAqi),
        recordCount: a.record_count,
      };
    }),
  };
}
