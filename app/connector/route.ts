import { NextResponse } from "next/server";
import { CONNECTOR_ENTITY, DEFAULT_CODE, fetchEntityRows, normalizeRows, toErrorPayload } from "../../lib/proxy";

export const dynamic = "force-dynamic";

export async function GET() {
  const entity = CONNECTOR_ENTITY;

  try {
    const rows = await fetchEntityRows(entity, DEFAULT_CODE);
    return NextResponse.json(normalizeRows(rows));
  } catch (error) {
    console.error("Proxy error:", {
      entity,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    const payload = toErrorPayload(error);
    return NextResponse.json(payload.body, { status: payload.status });
  }
}
