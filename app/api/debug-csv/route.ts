// app/api/debug-csv/route.ts
import { NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const REGION = process.env.S3_REGION || "us-east-1";
const BUCKET = process.env.RESULTS_BUCKET!;
const KEY = "results/results.csv";

async function streamToString(stream: any): Promise<string> {
  if (typeof stream?.getReader === "function") {
    const reader = stream.getReader(); const chunks: Uint8Array[] = [];
    for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); }
    return Buffer.concat(chunks).toString("utf8");
  }
  const chunks: Buffer[] = []; for await (const c of stream as AsyncIterable<Buffer>) chunks.push(Buffer.from(c));
  return Buffer.concat(chunks).toString("utf8");
}

export async function GET() {
  try {
    const s3 = new S3Client({ region: REGION });
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: KEY }));
    const text = await streamToString(obj.Body as any);
    const lines = text.split(/\r?\n/);
    return NextResponse.json({
      bytes: text.length,
      lines: lines.length,
      tail: lines.slice(Math.max(0, lines.length - 20)),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.name, msg: e?.message }, { status: 500 });
  }
}
