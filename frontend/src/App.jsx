import { useCallback, useState } from "react";
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

function App() {
  const [token, setToken] = useState(localStorage.getItem("access"));
  const [dataVersion, setDataVersion] = useState(0);
  const [settingsVersion, setSettingsVersion] = useState(0);

  const handleLogin = useCallback((nextToken) => {
    setToken(nextToken);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setToken(null);
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
          <Route
            path="/"
            element={
              <Dashboard
                key={`dashboard-${dataVersion}`}
                token={token}
                onUnauthorized={handleLogout}
              />
            }
          />
          <Route
            path="/reports"
            element={
              <Reports
                key={`reports-${dataVersion}`}
                token={token}
                onUnauthorized={handleLogout}
              />
            }
          />
          <Route
            path="/income"
            element={
              <Income
                key={`income-${dataVersion}`}
                token={token}
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
                token={token}
                onUnauthorized={handleLogout}
              />
            }
          />
          <Route
            path="/salaries"
            element={
              <Salaries
                key={`salaries-${dataVersion}`}
                token={token}
                onUnauthorized={handleLogout}
              />
            }
          />
          <Route
            path="/settings"
            element={
              <Settings
                token={token}
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
            <Navigate to={token ? "/" : "/login"} replace />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
