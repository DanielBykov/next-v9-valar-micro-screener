import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const apiKey = process.env.FRED_API;
  if (!apiKey) {
    return NextResponse.json({ message: "FRED_API env var is not set" }, { status: 500 });
  }

  const seriesId = request.nextUrl.searchParams.get("series") || "DFF";
  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json({ message: "start and end query params are required" }, { status: 400 });
  }

  const url = new URL("https://api.stlouisfed.org/fred/series/observations");
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("observation_start", start);
  url.searchParams.set("observation_end", end);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ message: `FRED API error: ${res.status} - ${text}` }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Failed to fetch from FRED" }, { status: 500 });
  }
}
