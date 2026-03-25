export interface EsriFeature {
  attributes: unknown;
}

export interface EsriQueryResponse {
  features?: EsriFeature[];
  exceededTransferLimit?: boolean;
  error?: { code: number; message: string };
}

/** Raw attributes from Endpoint 1 (Device_Joined_NewAPI). */
export interface DeviceAttributes {
  code: string;
  sourceid?: string;
  locationlatitude: number | null;
  locationlongitude: number | null;
  pm2_5concmassnowcastusepaaqi_va: number | null;
  pm2_5concmass1hourmean_value: number | null;
  pm10concmass1hourmean_value: number | null;
  no2conc1hourmean_value: number | null;
  o3conc1hourmean_value: number | null;
  temperatureinternal1hourmean_va: number | null;
  relhumidinternal1hourmean_value: number | null;
  windspeed1hourmean_value: number | null;
  winddirection1hourmean_value: number | null;
  overallstatus: string | null;
  lifestage: string | null;
  startofperiod_date?: number | null;
  endofperiod_date?: number | null;
}

/** Raw attributes from Endpoint 2 (records_v2_4) — hourly history records. */
export interface HistoryRecord {
  sourceid: string;
  startofperiod_date: number | null;
  pm2_5concmassnowcastusepaaqi_va: number | null;
  pm2_5concmass1hourmean_value: number | null;
  pm10concmass1hourmean_raw: number | null;
  no2conc1hourmean_value: number | null;
  o3conc1hourmean_value: number | null;
}

/** Attributes returned by outStatistics queries on Endpoint 2. */
export interface StatRecord {
  sourceid: string | null;
  avg_aqi: number | null;
  max_aqi: number | null;
  avg_pm25: number | null;
  avg_pm10: number | null;
  max_pm25: number | null;
  max_pm10: number | null;
  record_count: number | null;
}

/** Raw attributes from Endpoint 3 (archive 2024-2025, truncated field names). */
export interface ArchiveAttributes {
  sourceid: string | null;
  pm2_5con_6: number | null;  // PM2.5 NowCast AQI
  pm10concma: number | null;  // PM10 mass concentration µg/m³
  startofper: number | null;  // startofperiod_date truncated
}

export interface DeviceReading {
  code: string;
  location: { lat: number | null; lon: number | null };
  aqi: number | null;
  aqiLabel: string;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  o3: number | null;
  temperature: number | null;
  humidity: number | null;
  wind: { speed: number | null; direction: number | null };
  status: string | null;
  lifestage: string | null;
}
