"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
// Type the JSON as a name→path map
import rawFiles from "../vid_list.json";

interface VideoInfo {
  name: string;
  url: string;
}

type UserInfo = { name: string; culture: string };

const ratingOptions = ["Anger", "Happiness", "Neutral", "Sadness", "Surprise"] as const;

const VideoRating: React.FC = () => {
  const router = useRouter();

  // ✅ Convert {name: path} → VideoInfo[]
  const videos: VideoInfo[] = useMemo(() => {
    const map = rawFiles as Record<string, string>;
    return Object.entries(map).map(([name, url]) => ({ name, url }));
    // If you want a stable order, add: .sort((a,b) => a.name.localeCompare(b.name))
  }, []);

  const [user, setUser] = useState<UserInfo | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ratings, setRatings] = useState<{ video: string; rating: string }[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("userInfo");
    if (!stored) {
      router.push("/register");
      return;
    }
    try {
      setUser(JSON.parse(stored));
    } catch {
      router.push("/register");
    }
  }, [router]);

  const handleRating = (rating: string) => {
    const currentVideo = videos[currentIndex];
    if (!currentVideo) return;

    setRatings((prev) => [...prev, { video: currentVideo.name, rating }]);
    setCurrentIndex((prev) => Math.min(prev + 1, videos.length)); // clamp to “done”
  };

  const downloadCSV = () => {
    if (!user) return;
    const csvHeader = "Name,Culture,Video,Rating\n";
    const csvRows = ratings
      .map((r) => `${user.name},${user.culture},${r.video},${r.rating}`)
      .join("\n");
    const blob = new Blob([`\uFEFF${csvHeader}${csvRows}\n`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "video_ratings.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!user) return null;

  if (currentIndex >= videos.length) {
    return (
      <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <h2>All videos rated!</h2>
        <p>Total: {ratings.length} / {videos.length}</p>
        <button
          onClick={downloadCSV}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Download CSV
        </button>
      </div>
    );
  }

  const currentVideo = videos[currentIndex];

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: 800 }}>
      <h3>Welcome, {user.name}!</h3>
      <p>Culture: {user.culture}</p>

      <div style={{ margin: "0.5rem 0 1rem" }}>
        <div style={{ fontSize: 14, marginBottom: 4 }}>
          Video {currentIndex + 1} of {videos.length}: <strong>{currentVideo.name}</strong>
        </div>
        <div style={{ height: 8, background: "#eee", borderRadius: 4 }}>
          <div
            style={{
              width: `${(currentIndex / videos.length) * 100}%`,
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
        width="640"
        height="360"
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
};

export default VideoRating;
