import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";

// --- CSV helpers ---
function csvEscape(v: any): string {
  const s = String(v ?? "");
  // Escape if contains comma, quote, newline
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// Normalize backslashes → forward slashes, then parse "{culture}_{emotion}_{index}.ext"
function parseFromUrl(url: string) {
  const normalized = String(url).replace(/\\/g, "/");
  const filename = normalized.split("/").pop() || "";
  const m = filename.match(/^(.+?)_([A-Za-z]+)_(\d+)\.[^.]+$/i);
  return {
    stimCulture: m?.[1] ?? "",
    stimEmotion: m?.[2] ?? "",
    stimIndex: m?.[3] ?? "",
    filename,
    normalized,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Expect: { user: {name, culture}, ratings: [{ video, url, rating, time }] }
    const user = body?.user;
    const ratings = body?.ratings;

    if (!user?.name || !user?.culture || !Array.isArray(ratings)) {
      return NextResponse.json(
        { error: "Missing user {name,culture} or ratings[]" },
        { status: 400 }
      );
    }

    const resultsDir = path.join(process.cwd(), "results");
    const resultsPath = path.join(resultsDir, "results.csv");

    // Ensure dir exists
    await fsp.mkdir(resultsDir, { recursive: true });

    // If file doesn't exist, write header once
    if (!fs.existsSync(resultsPath)) {
      const header =
        "Name,UserCulture,Video,Rating,Time,StimCulture,StimEmotion,StimIndex,URL\n";
      await fsp.writeFile(resultsPath, header, "utf8");
    }

    // Build rows for this submission
    const lines = ratings.map((r: any) => {
      const meta = parseFromUrl(r?.url);
      const row = [
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
      return row;
    });

    // Append atomically-ish
    await fsp.appendFile(resultsPath, lines.join("\n") + "\n", "utf8");

    return NextResponse.json({
      ok: true,
      file: "results/results.csv",
      appended: lines.length,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to save CSV" },
      { status: 500 }
    );
  }
}
