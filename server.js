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

const handleEntityProxy = async (req, res) => {
  const entity = req.params.entity;
  const code = req.query.code || DEFAULT_CODE;

  try {
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
      return res.json(response.data);
    }

    if (Array.isArray(response.data?.data)) {
      return res.json(response.data.data);
    }

    return res.json([]);
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

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
