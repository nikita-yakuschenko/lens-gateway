import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_CODE, fetchEntityRows, normalizeDataLensRows, toErrorPayload } from "../../../../lib/proxy";

type RouteContext = {
  params: { entity: string };
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  const entity = params.entity;
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
