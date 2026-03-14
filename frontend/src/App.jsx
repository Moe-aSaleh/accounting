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
import { logoutUser, refreshAccessToken } from "./lib/api";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [settingsVersion, setSettingsVersion] = useState(0);

  useEffect(() => {
    let isActive = true;

    const bootstrapAuth = async () => {
      const refreshed = await refreshAccessToken({ failSilently: true });

      if (isActive) {
        setIsAuthenticated(refreshed);
        setAuthReady(true);
      }
    };

    bootstrapAuth();

    return () => {
      isActive = false;
    };
  }, []);

  const handleLogin = useCallback(() => {
    setIsAuthenticated(true);
    setAuthReady(true);
  }, []);

  const handleLogout = useCallback(async () => {
    await logoutUser();
    setIsAuthenticated(false);
  }, []);

  const handleIncomeChanged = useCallback(() => {
    setDataVersion((currentVersion) => currentVersion + 1);
  }, []);

  const handleDataImported = useCallback(() => {
    setDataVersion((currentVersion) => currentVersion + 1);
  }, []);

  const handleSettingsSaved = useCallback(() => {
    setSettingsVersion((currentVersion) => currentVersion + 1);
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
          element={isAuthenticated ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />}
        />

        <Route
          element={
            isAuthenticated ? (
              <AppLayout
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
          <Route
            path="/"
            element={
              <Dashboard
                key={`dashboard-${dataVersion}`}
                onUnauthorized={handleLogout}
              />
            }
          />
          <Route
            path="/reports"
            element={
              <Reports
                key={`reports-${dataVersion}`}
                onUnauthorized={handleLogout}
              />
            }
          />
          <Route
            path="/income"
            element={
              <Income
                key={`income-${dataVersion}`}
                onUnauthorized={handleLogout}
                onIncomeChanged={handleIncomeChanged}
              />
            }
          />
          <Route
            path="/expense"
            element={
              <Expense
                key={`expense-${dataVersion}`}
                onUnauthorized={handleLogout}
              />
            }
          />
          <Route
            path="/salaries"
            element={
              <Salaries
                key={`salaries-${dataVersion}`}
                onUnauthorized={handleLogout}
              />
            }
          />
          <Route
            path="/settings"
            element={
              <Settings
                onUnauthorized={handleLogout}
                onLogout={handleLogout}
                onSettingsSaved={handleSettingsSaved}
              />
            }
          />
        </Route>

        <Route
          path="*"
          element={
            <Navigate to={isAuthenticated ? "/" : "/login"} replace />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
