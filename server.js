const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT || 3010);
const DEFAULT_CODE = process.env.DEFAULT_CODE || "919";

const SOURCE_BASE_URL = process.env.SOURCE_BASE_URL || process.env.SOURCE_URL;
const LOGIN = process.env.SOURCE_LOGIN;
const PASSWORD = process.env.SOURCE_PASSWORD;
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 30000);

if (!SOURCE_BASE_URL || !LOGIN || !PASSWORD) {
  console.error("Missing required env vars: SOURCE_BASE_URL, SOURCE_LOGIN, SOURCE_PASSWORD");
  process.exit(1);
}

const authHeader = `Basic ${Buffer.from(`${LOGIN}:${PASSWORD}`, "utf8").toString("base64")}`;
const normalizedBaseUrl = SOURCE_BASE_URL.replace(/\/+$/, "");

const CYR_TO_LAT = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i",
  й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "",
  э: "e", ю: "yu", я: "ya",
};

const toAsciiKey = (key) =>
  String(key)
    .toLowerCase()
    .split("")
    .map((ch) => CYR_TO_LAT[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

const toFlatRecord = (record) => {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return {};
  }

  const flat = {};
  for (const [key, value] of Object.entries(record)) {
    if (value !== null && typeof value === "object") {
      flat[key] = JSON.stringify(value);
    } else {
      flat[key] = value;
    }
  }

  return flat;
};

const toDataLensScalar = (value) => {
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

const fetchEntityRows = async (entity, code) => {
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

const handleEntityProxy = async (req, res) => {
  const entity = req.params.entity;
  const code = req.query.code || DEFAULT_CODE;

  try {
    const rows = await fetchEntityRows(entity, code);
    return res.json(rows.map(toFlatRecord));
  } catch (error) {
    console.error("Proxy error:", {
      entity,
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data,
    });

    const status = error.response?.status || 502;
    res.status(status).json({
      error: "proxy_request_failed",
      message: error.message,
      upstreamStatus: error.response?.status || null,
      upstreamData: error.response?.data || null,
    });
  }
};

const handleDataLensProxy = async (req, res) => {
  const entity = req.params.entity;
  const code = req.query.code || DEFAULT_CODE;

  try {
    const rows = await fetchEntityRows(entity, code);
    const normalizedRows = rows.map((row) => {
      const flat = toFlatRecord(row);
      const out = {};

      for (const [key, value] of Object.entries(flat)) {
        const asciiKey = toAsciiKey(key) || "field";
        out[asciiKey] = toDataLensScalar(value);
      }

      return out;
    });

    const allKeys = Array.from(new Set(normalizedRows.flatMap((row) => Object.keys(row))));
    const stableRows = normalizedRows.map((row) => {
      const out = {};
      for (const key of allKeys) {
        out[key] = row[key] ?? "";
      }
      return out;
    });

    return res.json(stableRows);
  } catch (error) {
    console.error("Proxy error:", {
      entity,
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data,
    });

    const status = error.response?.status || 502;
    res.status(status).json({
      error: "proxy_request_failed",
      message: error.message,
      upstreamStatus: error.response?.status || null,
      upstreamData: error.response?.data || null,
    });
  }
};

app.get("/:entity/get", handleEntityProxy);
app.get("/datalens/:entity/get", handleDataLensProxy);
app.get("/get", async (req, res) => {
  const entity = String(req.query.entity || "sorders");
  const code = req.query.code || DEFAULT_CODE;

  try {
    const rows = await fetchEntityRows(entity, code);
    const normalizedRows = rows.map((row) => {
      const flat = toFlatRecord(row);
      const out = {};

      for (const [key, value] of Object.entries(flat)) {
        const asciiKey = toAsciiKey(key) || "field";
        out[asciiKey] = toDataLensScalar(value);
      }

      return out;
    });

    const allKeys = Array.from(new Set(normalizedRows.flatMap((row) => Object.keys(row))));
    const stableRows = normalizedRows.map((row) => {
      const out = {};
      for (const key of allKeys) {
        out[key] = row[key] ?? "";
      }
      return out;
    });

    return res.json(stableRows);
  } catch (error) {
    console.error("Proxy error:", {
      entity,
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data,
    });

    const status = error.response?.status || 502;
    res.status(status).json({
      error: "proxy_request_failed",
      message: error.message,
      upstreamStatus: error.response?.status || null,
      upstreamData: error.response?.data || null,
    });
  }
});
app.get("/", (req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
