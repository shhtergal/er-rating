import { NextRequest, NextResponse } from "next/server";
import { S3Client, HeadObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";


const REGION = 'eu-north-1';            // ← unchanged
const KEY = "results/results.csv";

const s3 = new S3Client({ region: REGION });

// --- helpers ---
function csvEscape(v: any): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function parseFromUrl(url: string) {
  const normalized = String(url).replace(/\\/g, "/");
  const filename = normalized.split("/").pop() || "";
  const m = filename.match(/^(.+?)_([A-Za-z]+)_(\d+)\.[^.]+$/i);
  return {
    stimCulture: m?.[1] ?? "",
    stimEmotion: m?.[2] ?? "",
    stimIndex: m?.[3] ?? "",
    normalized,
  };
}
async function streamToString(stream: any): Promise<string> {
  // Node 18+ GetObject returns a web stream in AWS SDK v3
  if (typeof stream?.getReader === "function") {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString("utf8");
  }
  // Fallback (older runtimes)
  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer>) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

export async function POST(req: NextRequest) {
  if (!BUCKET) {
    return NextResponse.json({ error: "RESULTS_BUCKET env var is not set" }, { status: 500 });
  }

  try {
    const { user, ratings } = await req.json();

    if (!user?.name || !user?.culture || !Array.isArray(ratings)) {
      return NextResponse.json({ error: "Missing user {name,culture} or ratings[]" }, { status: 400 });
    }

    // Build rows
    const lines: string[] = ratings.map((r: any) => {
      const meta = parseFromUrl(r?.url);
      return [
        csvEscape(user.name),
        csvEscape(user.culture),
        csvEscape(r?.video),
        csvEscape(r?.rating),
        csvEscape(r?.time ?? new Date().toISOString()),
        csvEscape(meta.stimCulture),
        csvEscape(meta.stimEmotion),
        csvEscape(meta.stimIndex),
        csvEscape(meta.normalized),
      ].join(",");
    });

    const header = "Name,UserCulture,Video,Rating,Time,StimCulture,StimEmotion,StimIndex,URL\n";

    // Check if file exists
    let exists = true;
    try {
      await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: KEY }));
    } catch {
      exists = false;
    }

    if (!exists) {
      // Create new file with header + rows
      const body = header + lines.join("\n") + "\n";
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: KEY,
        Body: body,
        ContentType: "text/csv; charset=utf-8",
      }));
      return NextResponse.json({ ok: true, created: true, appended: lines.length, key: KEY });
    }

    // Append: read current, concatenate, write back (overwrite)
    const current = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: KEY }));
    const currentText = await streamToString(current.Body as any);
    const newBody = currentText + lines.join("\n") + "\n";

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: KEY,
      Body: newBody,
      ContentType: "text/csv; charset=utf-8",
    }));

    return NextResponse.json({ ok: true, created: false, appended: lines.length, key: KEY });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to append to S3 CSV" }, { status: 500 });
  }
}
