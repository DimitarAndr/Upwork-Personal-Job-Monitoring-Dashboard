"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });

      if (response.ok) {
        router.push("/admin");
        router.refresh();
      } else {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(result?.error ?? "Authentication failed");
      }
    } catch {
      setError("Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      background: "#f5f5f5"
    }}>
      <div style={{ 
        background: "white", 
        padding: "2rem", 
        borderRadius: "8px", 
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        width: "100%",
        maxWidth: "400px"
      }}>
        <h1 style={{ marginBottom: "1.5rem", fontSize: "1.5rem" }}>Internal Operations</h1>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="token" style={{ display: "block", marginBottom: "0.5rem" }}>
              Access Token
            </label>
            <input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your access token"
              required
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "1rem"
              }}
            />
          </div>
          {error && (
            <div style={{ 
              color: "#d32f2f", 
              marginBottom: "1rem", 
              fontSize: "0.875rem" 
            }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.75rem",
              background: "#1976d2",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "1rem",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? "Authenticating..." : "Access Admin Panel"}
          </button>
        </form>
      </div>
    </div>
  );
}
