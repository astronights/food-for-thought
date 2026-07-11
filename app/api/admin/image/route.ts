import { get } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";

export async function GET(req: NextRequest) {
  const user = await requireAdmin();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const path = req.nextUrl.searchParams.get("path");

  if (!path) {
    return NextResponse.json(
      { error: "No path specified" },
      { status: 400 }
    );
  }

  const result = await get(path, {
    access: "private",
  });

  if (!result || result.statusCode !== 200) {
    return NextResponse.json(
      { error: "Image not found" },
      { status: 404 }
    );
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type":
        result.blob.contentType ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      ETag: result.blob.etag,
      "Cache-Control": "private, no-cache",
    },
  });
}