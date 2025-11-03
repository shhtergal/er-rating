"use client";

import React, { useState } from "react";

// ---------- Login + Radio Form Combined ----------
const RadioForm: React.FC = () => {
  // Login state
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Radio form state
  const [selected, setSelected] = useState("");
  const options = ["Option 1", "Option 2", "Option 3", "Option 4", "Option 5"];

  // Mock login handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Replace this with real auth logic later
    if (username === "admin" && password === "1234") {
      setLoggedIn(true);
    } else {
      alert("Invalid username or password");
    }
  };

  // CSV export
  const handleExportCSV = () => {
    if (!selected) {
      alert("Please select an option first!");
      return;
    }

    const csvContent = `data:text/csv;charset=utf-8,Username,Selection\n${username},${selected}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "selection.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ---------- Render ----------
  if (!loggedIn) {
    // Login form
    return (
      <div style={{ padding: "2rem", textAlign: "center", fontFamily: "sans-serif" }}>
        <h2>Login</h2>
        <form onSubmit={handleLogin} style={{ display: "inline-block", textAlign: "left" }}>
          <div style={{ marginBottom: "1rem" }}>
            <label>Username:</label><br />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label>Password:</label><br />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Log In
          </button>
        </form>
      </div>
    );
  }

  // Radio form
  return (
    <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>
      <h3>Welcome, {username}!</h3>
      <p>Please select one option:</p>

      <form style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {options.map((option, i) => (
          <label key={i}>
            <input
              type="radio"
              name="selection"
              value={option}
              checked={selected === option}
              onChange={(e) => setSelected(e.target.value)}
            />
            {option}
          </label>
        ))}
      </form>

      <button
        onClick={handleExportCSV}
        style={{
          marginTop: "1rem",
          padding: "0.5rem 1rem",
          backgroundColor: "#28a745",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Save to CSV
      </button>
    </div>
  );
};

export default RadioForm;
