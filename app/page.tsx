"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [culture, setCulture] = useState("");

  const cultures = [
    "American",
    "Japanese",
    "Indian",
    "Brazilian",
    "Nigerian",
    "Other",
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const userName = name.trim() || "Anonymous";
    if (!culture) {
      alert("Please select a culture.");
      return;
    }

    // Save to localStorage
    localStorage.setItem(
      "userInfo",
      JSON.stringify({ name: userName, culture })
    );

    // Go to form page
    router.push("/form");
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        fontFamily: "sans-serif",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          border: "1px solid #ccc",
          padding: "2rem",
          borderRadius: "8px",
          minWidth: "320px",
        }}
      >
        <h2>Registration</h2>

        <label style={{ display: "block", marginTop: "1rem" }}>
          Name (or leave blank for Anonymous):
        </label>
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: "100%", padding: "0.5rem", marginTop: "0.5rem" }}
        />

        <label style={{ display: "block", marginTop: "1rem" }}>
          Select your culture:
        </label>
        <select
          value={culture}
          onChange={(e) => setCulture(e.target.value)}
          style={{ width: "100%", padding: "0.5rem", marginTop: "0.5rem" ,backgroundColor: "#000000ff",}}
          required
        >
          <option value="">-- Select a culture --</option>
          {cultures.map((c, i) => (
            <option key={i} value={c}>
              {c}
            </option>
          ))}
        </select>

        <button
          type="submit"
          style={{
            marginTop: "1.5rem",
            width: "100%",
            padding: "0.75rem",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Continue
        </button>
      </form>
    </div>
  );
}
