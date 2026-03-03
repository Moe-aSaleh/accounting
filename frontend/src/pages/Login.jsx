import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../lib/api";

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("http://127.0.0.1:8000/api/token/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      let data = null;

      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (res.ok && data.access) {
        localStorage.setItem("access", data.access);
        localStorage.setItem("refresh", data.refresh);
        onLogin(data.access);
        navigate("/");
      } else {
        setError(getApiErrorMessage(data, "Invalid credentials"));
      }
    } catch {
      setError("Login failed");
    }
  };

  return (
    <div className="page-shell auth-shell">
      <div className="panel auth-panel">
        <h1>Login</h1>
        <form className="stack-form" onSubmit={handleLogin}>
          <input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">Login</button>
        </form>
        {error && <p className="status-message error">{error}</p>}
      </div>
    </div>
  );
}
