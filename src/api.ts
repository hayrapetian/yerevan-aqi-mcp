import type { EsriQueryResponse } from './types.js';

const BASE_URL = 'https://gis.yerevan.am/server/rest/services/Hosted';

const MIN_REQUEST_INTERVAL_MS = 200;
let lastRequestTime = 0;

const throttle = async (): Promise<void> => {
  const now = Date.now();
  const wait = MIN_REQUEST_INTERVAL_MS - (now - lastRequestTime);
  if (wait > 0) {
    lastRequestTime = now + wait; // claim the slot before sleeping so concurrent callers queue up
    await new Promise(resolve => setTimeout(resolve, wait));
  } else {
    lastRequestTime = now;
  }
}

export const ENDPOINTS = {
  devices: `${BASE_URL}/Device_Joined_NewAPI/FeatureServer/0/query`,
  history: `${BASE_URL}/records_v2_4/FeatureServer/0/query`,
  archive: `${BASE_URL}/Air_Pollution_2024_2025_Live/FeatureServer/0/query`,
} as const;

type Params = Record<string, string | number | boolean | undefined | null>;

/**
 * Query an ESRI FeatureServer endpoint.
 * Always appends f=json. Undefined/null values are omitted.
 */
export const queryFeatureServer = async (
  endpoint: string,
  params: Params = {},
): Promise<EsriQueryResponse> => {
  const url = new URL(endpoint);
  url.searchParams.set('f', 'json');

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  await throttle();
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = (await response.json()) as EsriQueryResponse;
  if (data.error) {
    throw new Error(`API error ${data.error.code}: ${data.error.message}`);
  }

  return data;
}
