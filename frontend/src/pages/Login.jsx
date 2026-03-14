import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl, getApiErrorMessage } from "../lib/api";

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch(buildApiUrl("/api/token/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      let data = null;
      try { data = await res.json(); } catch { data = null; }

      if (res.ok && data?.access) {
        localStorage.setItem("access", data.access);
        localStorage.setItem("refresh", data.refresh);
        onLogin(data.access);
        navigate("/");
      } else {
        setError(getApiErrorMessage(data, "Invalid credentials"));
      }
    } catch {
      setError("Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ws-auth">
      <div className="ws-auth-card">
        <div className="ws-auth-mark">WS</div>
        <h1>Sign in</h1>
        <p>Enter your credentials to access the workspace.</p>

        <form className="ws-form-stack" onSubmit={handleLogin}>
          <label className="ws-field">
            <span className="ws-label">Username</span>
            <input
              placeholder="username"
              value={username}
              autoComplete="username"
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>

          <label className="ws-field">
            <span className="ws-label">Password</span>
            <input
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <button type="submit" disabled={submitting} className="ws-btn-wide" style={{ marginTop: "6px" }}>
            {submitting ? (
              <>
                <span className="ws-spinner" aria-hidden="true" />
                <span>Signing in...</span>
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        {error && <p className="ws-msg error">{error}</p>}
      </div>
    </div>
  );
}
