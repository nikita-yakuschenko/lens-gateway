import axios, { AxiosError } from "axios";

export const DEFAULT_CODE = process.env.DEFAULT_CODE || "919";
export const CONNECTOR_ENTITY = process.env.CONNECTOR_ENTITY || "sorders";
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 30000);

type Row = Record<string, unknown>;

export const toFlatRecord = (record: unknown): Row => {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return {};
  }

  const flat: Row = {};
  for (const [key, value] of Object.entries(record as Row)) {
    if (value !== null && typeof value === "object") {
      flat[key] = JSON.stringify(value);
    } else {
      flat[key] = value;
    }
  }

  return flat;
};

export const normalizeRows = (rows: unknown[]): Row[] => rows.map(toFlatRecord);

export const fetchEntityRows = async (entity: string, code: string): Promise<unknown[]> => {
  const SOURCE_BASE_URL = process.env.SOURCE_BASE_URL || process.env.SOURCE_URL;
  const LOGIN = process.env.SOURCE_LOGIN;
  const PASSWORD = process.env.SOURCE_PASSWORD;

  if (!SOURCE_BASE_URL || !LOGIN || !PASSWORD) {
    throw new Error("Missing required env vars: SOURCE_BASE_URL, SOURCE_LOGIN, SOURCE_PASSWORD");
  }

  const authHeader = `Basic ${Buffer.from(`${LOGIN}:${PASSWORD}`, "utf8").toString("base64")}`;
  const normalizedBaseUrl = SOURCE_BASE_URL.replace(/\/+$/, "");

  const response = await axios.get(`${normalizedBaseUrl}/${entity}/get`, {
    params: { code },
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      Authorization: authHeader,
      Accept: "application/json; charset=utf-8",
    },
    responseType: "json",
  });

  if (Array.isArray(response.data)) {
    return response.data;
  }
  if (Array.isArray(response.data?.data)) {
    return response.data.data;
  }
  return [];
};

export const toErrorPayload = (error: unknown) => {
  const axiosError = error as AxiosError;

  return {
    status: axiosError.response?.status || 502,
    body: {
      error: "proxy_request_failed",
      message: axiosError.message,
      upstreamStatus: axiosError.response?.status || null,
      upstreamData: axiosError.response?.data || null,
    },
  };
};
