import { NextRequest, NextResponse } from "next/server";
import { S3Client, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.S3_REGION || "us-east-1";             // ← changed
const BUCKET = process.env.RESULTS_BUCKET!;                      // ← unchanged
const KEY = "results/results.csv";

const s3 = new S3Client({ region: REGION });

export async function GET(_req: NextRequest) {
  if (!BUCKET) {
    return NextResponse.json({ error: "RESULTS_BUCKET env var is not set" }, { status: 500 });
  }
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: KEY }));
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const expiresIn = 300; // 5 minutes
  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: KEY }),
    { expiresIn }
  );

  // Redirect browser to S3 for the download
  return NextResponse.redirect(url, { status: 302 });
}
