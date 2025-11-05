// app/api/get-csv/route.ts
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const p = path.join(process.cwd(), "results", "results.csv");
  if (!fs.existsSync(p)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
  const csv = fs.readFileSync(p, "utf8");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="results.csv"',
    },
  });
}
