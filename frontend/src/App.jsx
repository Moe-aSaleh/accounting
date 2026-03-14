import { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import AppLayout from "./components/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import Income from "./pages/Income";
import Expense from "./pages/Expense";
import Salaries from "./pages/Salaries";
import Settings from "./pages/Settings";
import { clearStoredTokens, refreshAccessToken } from "./lib/api";

function App() {
  const [token, setToken] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [settingsVersion, setSettingsVersion] = useState(0);

  useEffect(() => {
    let isActive = true;

    const bootstrapAuth = async () => {
      const storedAccess = localStorage.getItem("access");
      const storedRefresh = localStorage.getItem("refresh");

      if (!storedAccess && !storedRefresh) {
        if (isActive) { setToken(null); setAuthReady(true); }
        return;
      }

      if (storedRefresh) {
        const nextAccessToken = await refreshAccessToken({ failSilently: true });
        if (!isActive) return;
        if (nextAccessToken) {
          setToken(nextAccessToken);
        } else {
          clearStoredTokens();
          setToken(null);
        }
        setAuthReady(true);
        return;
      }

      if (isActive) { setToken(storedAccess); setAuthReady(true); }
    };

    bootstrapAuth();
    return () => { isActive = false; };
  }, []);

  const handleLogin = useCallback((nextToken) => {
    setToken(nextToken);
    setAuthReady(true);
  }, []);

  const handleLogout = useCallback(() => {
    clearStoredTokens();
    setToken(null);
  }, []);

  const handleIncomeChanged = useCallback(() => {
    setDataVersion((v) => v + 1);
  }, []);

  const handleDataImported = useCallback(() => {
    setDataVersion((v) => v + 1);
  }, []);

  const handleSettingsSaved = useCallback(() => {
    setSettingsVersion((v) => v + 1);
  }, []);

  if (!authReady) {
    return (
      <div className="ws-loading-screen">
        <div className="ws-loading-card">
          <div className="ws-loading-mark">WS</div>
          <div className="ws-loading-text">
            <span className="ws-spinner" aria-hidden="true" />
            <span>Checking your account...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={token ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />}
        />
        <Route
          element={
            token ? (
              <AppLayout
                token={token}
                onLogout={handleLogout}
                onUnauthorized={handleLogout}
                settingsVersion={settingsVersion}
                onDataImported={handleDataImported}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route path="/" element={<Dashboard key={`dashboard-${dataVersion}`} token={token} onUnauthorized={handleLogout} />} />
          <Route path="/reports" element={<Reports key={`reports-${dataVersion}`} token={token} onUnauthorized={handleLogout} />} />
          <Route path="/income" element={<Income key={`income-${dataVersion}`} token={token} onUnauthorized={handleLogout} onIncomeChanged={handleIncomeChanged} />} />
          <Route path="/expense" element={<Expense key={`expense-${dataVersion}`} token={token} onUnauthorized={handleLogout} />} />
          <Route path="/salaries" element={<Salaries key={`salaries-${dataVersion}`} token={token} onUnauthorized={handleLogout} />} />
          <Route path="/settings" element={<Settings token={token} onUnauthorized={handleLogout} onLogout={handleLogout} onSettingsSaved={handleSettingsSaved} />} />
        </Route>
        <Route path="*" element={<Navigate to={token ? "/" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
