import axios, { AxiosError } from "axios";

export const DEFAULT_CODE = process.env.DEFAULT_CODE || "919";
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 30000);

const CYR_TO_LAT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i",
  й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "",
  э: "e", ю: "yu", я: "ya",
};

type Row = Record<string, unknown>;

const toAsciiKey = (key: string): string =>
  String(key)
    .toLowerCase()
    .split("")
    .map((ch) => CYR_TO_LAT[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

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

const toDataLensScalar = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
};

export const normalizeDataLensRows = (rows: unknown[]): Record<string, string>[] => {
  const normalizedRows = rows.map((row) => {
    const flat = toFlatRecord(row);
    const out: Record<string, string> = {};

    for (const [key, value] of Object.entries(flat)) {
      const asciiKey = toAsciiKey(key) || "field";
      out[asciiKey] = toDataLensScalar(value);
    }

    return out;
  });

  const allKeys = Array.from(new Set(normalizedRows.flatMap((row) => Object.keys(row))));
  return normalizedRows.map((row) => {
    const out: Record<string, string> = {};
    for (const key of allKeys) {
      out[key] = row[key] ?? "";
    }
    return out;
  });
};

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
