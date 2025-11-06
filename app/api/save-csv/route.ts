import { NextRequest, NextResponse } from "next/server";
import {
  S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand
} from "@aws-sdk/client-s3";
export const runtime = 'nodejs';     // ensure Lambda, not Edge
export const dynamic = 'force-dynamic'; // avoid static optimization



const REGION = 'eu-north-1';
const BUCKET = "er-website-results";       
const KEY = "results/results.csv";

const s3 = new S3Client({ region: REGION });

function csvEscape(v: any): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function parseFromUrl(url: string) {
  const normalized = String(url).replace(/\\/g, "/");
  const filename = normalized.split("/").pop() || "";
  const m = filename.match(/^(.+?)_([A-Za-z]+)_(\d+)\.[^.]+$/i);
  return {
    stimCulture: m?.[1] ?? "", stimEmotion: m?.[2] ?? "", stimIndex: m?.[3] ?? "", normalized
  };
}
async function streamToString(stream: any): Promise<string> {
  if (typeof stream?.getReader === "function") {
    const reader = stream.getReader(); const chunks: Uint8Array[] = [];
    for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); }
    return Buffer.concat(chunks).toString("utf8");
  }
  const chunks: Buffer[] = []; for await (const c of stream as AsyncIterable<Buffer>) chunks.push(Buffer.from(c));
  return Buffer.concat(chunks).toString("utf8");
}
function tailLines(text: string, n = 10) {
  const lines = text.split(/\r?\n/); return lines.slice(Math.max(0, lines.length - n));
}

export async function POST(req: NextRequest) {
  if (!BUCKET) return NextResponse.json({ error: "RESULTS_BUCKET missing" }, { status: 500 });

  const s3 = new S3Client({ region: REGION });

  try {
    const { user, ratings } = await req.json();
    if (!user?.name || !user?.culture || !Array.isArray(ratings)) {
      return NextResponse.json({ error: "Missing user {name,culture} or ratings[]" }, { status: 400 });
    }

    const header = "Name,UserCulture,Video,Rating,Time,StimCulture,StimEmotion,StimIndex,URL\n";

    // Build the exact block we’ll append (to verify later)
    const lines = ratings.map((r: any) => {
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
    const appendBlock = lines.join("\n") + "\n";

    // Does the file exist?
    let exists = false;
    let beforeText = "";
    try {
      const list = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: KEY, MaxKeys: 1 }));
      exists = (list.Contents || []).some(o => o.Key === KEY);
    } catch (e) {
      console.log(e)
    }

    if (exists) {
      try {
        const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: KEY }));
        beforeText = await streamToString(obj.Body as any);
      } catch (e: any) {
        // If we cannot read, we’ll create anew with header below
        console.log(e)
        exists = false;
      }
    }

    // Compose new body
    const newBody = (exists ? beforeText : header) + appendBlock;

    // Put and verify (retry x2)
    let putOk = false;
    let verifyOk = false;
    let afterText = "";
    let tries = 0;
    let lastPutErr: any = null;
    let lastGetErr: any = null;

    while (tries < 3 && !verifyOk) {
      tries++;
      try {
        await s3.send(new PutObjectCommand({
          Bucket: BUCKET, Key: KEY, Body: newBody, ContentType: "text/csv; charset=utf-8",
        }));
        putOk = true;
      } catch (e: any) {
        lastPutErr = { name: e?.name, msg: e?.message };
        break; // Put failed; no point verifying
      }

      // Read back and confirm the appended block is present
      try {
        const obj2 = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: KEY }));
        afterText = await streamToString(obj2.Body as any);
        verifyOk = afterText.endsWith(appendBlock) || afterText.includes(appendBlock);
      } catch (e: any) {
        console.log(e)
        lastGetErr = { name: e?.name, msg: e?.message };
      }
    }

    const resp = {
      ok: putOk && verifyOk,
      appended: lines.length,
      tries,
      bucket: BUCKET,
      key: KEY,
      region: REGION,
      before: { exists, bytes: beforeText.length, tail: tailLines(beforeText).join("\n") },
      after: { bytes: afterText.length, tail: tailLines(afterText).join("\n") },
      putError: lastPutErr,
      getError: lastGetErr,
      verifyOk,
    };

    if (!resp.ok) return NextResponse.json(resp, { status: 500 });
    return NextResponse.json(resp, { status: 200 });
  } catch (e: any) {
    console.log(e)
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
