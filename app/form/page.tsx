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
  const [saving, setSaving] = useState(false);

  const LIMIT = 2;

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
      if (saving || submitted) return;
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
        setDone(true);
      } else {
        setCurrentIndex(next);
      }
    },
    [currentIndex, videos, saving, submitted]
  );

  useEffect(() => {
    if (!done || submitted || !user) return;

    const ctrl = new AbortController();

    const sendToServer = async () => {
      try {
        setSaving(true);
        const resp = await fetch("/api/save-csv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user, ratings }),
          signal: ctrl.signal,
        });

        if (!resp.ok) {
          const msg = await resp.text().catch(() => "");
          throw new Error(`Save failed: ${resp.status} ${msg}`);
        }
        setSubmitted(true);
      } catch (err) {
        console.error(err);
        alert("Failed to save results. Please try again.");
      } finally {
        setSaving(false);
      }
    };

    sendToServer();
    return () => ctrl.abort();
  }, [done, submitted, user, ratings]);

  if (!user) return null;

  if (submitted) {
    return (
      <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <h2>All videos rated!</h2>
        <p>Thank you. Your responses were saved.</p>
      </div>
    );
  }

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
            disabled={saving}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: saving ? "#93c5fd" : "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}
