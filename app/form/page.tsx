"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import rawFiles from "../vid_list.json";

interface VideoInfo {
  name: string;
  url: string;
}

type UserInfo = { name: string; culture: string };
const ratingOptions = ["Anger", "Happiness", "Neutral", "Sadness", "Surprise"] as const;

function shuffleArray<T>(array: T[]): T[] {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// normalize backslashes → forward slashes, then parse "{culture}_{emotion}_{index}.ext"
function parseFromUrl(url: string) {
  const normalized = url.replace(/\\/g, "/");
  const filename = normalized.split("/").pop() || "";
  // e.g., "videos/il_Happiness_012.mp4" → il, Happiness, 012
  const m = filename.match(/^(.+?)_([A-Za-z]+)_(\d+)\.[^.]+$/i);
  return {
    stimCulture: m?.[1] ?? "",
    stimEmotion: m?.[2] ?? "",
    stimIndex: m?.[3] ?? "",
    filename,
  };
}

export default function VideoRating() {
  const router = useRouter();

  const videos: VideoInfo[] = useMemo(() => {
    const map = rawFiles as Record<string, string>;
    const list = Object.entries(map).map(([name, url]) => ({ name, url }));
    return shuffleArray(list);
  }, []);

  const [user, setUser] = useState<UserInfo | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ratings, setRatings] = useState<
    { video: string; url: string; rating: string; time: string }[]
  >([]);
  const [done, setDone] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // limit how many videos to rate in one session (set to videos.length to do all)
  const LIMIT = 100;

  useEffect(() => {
    try {
      const stored = localStorage.getItem("userInfo");
      if (!stored) {
        router.push("/register");
        return;
      }
      setUser(JSON.parse(stored));
    } catch {
      router.push("/register");
    }
  }, [router]);

  const handleRating = useCallback(
    (rating: string) => {
      const currentVideo = videos[currentIndex];
      if (!currentVideo) return;

      setRatings((prev) => [
        ...prev,
        {
          video: currentVideo.name,
          url: currentVideo.url,
          rating,
          time: new Date().toISOString(),
        },
      ]);

      const next = currentIndex + 1;
      if (next >= Math.min(videos.length, LIMIT)) {
        setDone(true); // triggers save effect below
      } else {
        setCurrentIndex(next);
      }
    },
    [currentIndex, videos]
  );

  // Save CSV to server once we're done
  useEffect(() => {
    if (!done || submitted || !user) return;

    const sendCsvToServer = async () => {
      try {
        const csvHeader =
          "Name,UserCulture,Video,Rating,Time,StimCulture,StimEmotion,StimIndex,URL\n";

        const csvRows = ratings
          .map((r) => {
            const meta = parseFromUrl(r.url);
            return [
              user.name,
              user.culture,
              r.video,           // original name key from vid_list.json
              r.rating,
              r.time,
              meta.stimCulture,  // parsed from URL
              meta.stimEmotion,  // parsed from URL
              meta.stimIndex,    // parsed from URL
              r.url,             // full URL for traceability
            ].join(",");
          })
          .join("\n");

        const csvContent = `\uFEFF${csvHeader}${csvRows}\n`;

        const resp = await fetch("/api/save-csv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user, ratings }), // send raw data; server builds CSV
        });

        if (!resp.ok) {
          const msg = await resp.text().catch(() => "");
          throw new Error(`Save failed: ${resp.status} ${msg}`);
        }
11
        setSubmitted(true);
      } catch (err) {
        console.error(err);
        alert("Failed to save results. Please try again.");
      }
    };1

    sendCsvToServer();
  }, [done, submitted, user, ratings]);

  if (!user) return null;

  // Finished UI
  if (submitted) {
    return (
      <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <h2>All videos rated!</h2>
        <p>Thank you. Your responses were saved.</p>
      </div>
    );
  }

  // Show “saving” while done but not yet submitted
  if (done && !submitted) {
    return (
      <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <h2>Saving your responses…</h2>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <h2>No videos found.</h2>
      </div>
    );
  }

  const maxCount = Math.min(videos.length, LIMIT);
  const currentVideo = videos[currentIndex];

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: 800 }}>
      <h3>Welcome, {user.name}!</h3>
      <p>Culture: {user.culture}</p>

      <div style={{ margin: "0.5rem 0 1rem" }}>
        <div style={{ fontSize: 14, marginBottom: 4 }}>
          Video {currentIndex + 1} of {maxCount}: <strong>{currentVideo.name}</strong>
        </div>
        <div style={{ height: 8, background: "#eee", borderRadius: 4 }}>
          <div
            style={{
              width: `${(currentIndex / maxCount) * 100}%`,
              height: "100%",
              borderRadius: 4,
              background: "#007bff",
              transition: "width 200ms ease",
            }}
          />
        </div>
      </div>

      <video
        key={currentVideo.url}
        controls
        style={{ display: "block", marginBottom: "1rem", width: "100%", height: "auto" }}
      >
        <source src={currentVideo.url} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {ratingOptions.map((r) => (
          <button
            key={r}
            onClick={() => handleRating(r)}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}
