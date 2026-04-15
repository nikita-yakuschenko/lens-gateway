import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_CODE, fetchEntityRows, normalizeDataLensRows, toErrorPayload } from "../../lib/proxy";

export async function GET(request: NextRequest) {
  const entity = request.nextUrl.searchParams.get("entity") || "sorders";
  const code = request.nextUrl.searchParams.get("code") || DEFAULT_CODE;

  try {
    const rows = await fetchEntityRows(entity, code);
    return NextResponse.json(normalizeDataLensRows(rows));
  } catch (error) {
    console.error("Proxy error:", {
      entity,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    const payload = toErrorPayload(error);
    return NextResponse.json(payload.body, { status: payload.status });
  }
}
