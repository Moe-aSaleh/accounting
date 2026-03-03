import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  fetchProtectedJson,
  postProtectedAction,
  uploadProtectedFile,
} from "../lib/api";
import { formatCurrency } from "../lib/format";
import { MONTH_GROUPS, MONTH_OPTIONS } from "../lib/months";

export default function AppLayout({
  token,
  onLogout,
  onUnauthorized,
  monthTotalsVersion,
  settingsVersion,
  onDataImported,
  selectedMonth,
  onMonthChange,
}) {
  const location = useLocation();
  const [isMonthPanelOpen, setIsMonthPanelOpen] = useState(false);
  const [monthTotals, setMonthTotals] = useState({});
  const [companySettings, setCompanySettings] = useState(null);
  const [importMessage, setImportMessage] = useState("");
  const [importError, setImportError] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);
  const navClassName = ({ isActive }) =>
    isActive ? "app-nav-link active" : "app-nav-link";
  const selectedMonthIndex = MONTH_OPTIONS.findIndex((month) => month.key === selectedMonth);
  const selectedMonthMatch = MONTH_OPTIONS.find((month) => month.key === selectedMonth);
  const selectedMonthYear = selectedMonth.split("-")[0];
  const selectedMonthLabel = selectedMonthMatch
    ? `${selectedMonthMatch.label} ${selectedMonthYear}`
    : selectedMonth;
  const routeTitle = {
    "/": "Dashboard",
    "/reports": "Reports",
    "/income": "Income",
    "/expense": "Expenses",
    "/salaries": "Salaries",
    "/settings": "Settings",
  }[location.pathname] || "Workspace";
  const companyName = companySettings?.name || "Accounting App";
  const currentUserRole = companySettings?.current_user_role || null;
  const canAccessSalaries =
    currentUserRole === "owner" ||
    currentUserRole === "accountant" ||
    currentUserRole === "viewer";
  const canManageProtectedActions = currentUserRole === "owner";
  const canAccessReports = currentUserRole !== "staff" && currentUserRole !== null;
  const showReportControls = location.pathname === "/reports" && canAccessReports;
  const companyInitials = companyName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "AC";

  useEffect(() => {
    if (!showReportControls) {
      setMonthTotals({});
      return;
    }

    let isActive = true;

    const loadMonthOverview = async () => {
      try {
        const data = await fetchProtectedJson("/api/month-overview/", {
          token,
          onUnauthorized,
          fallbackMessage: "Failed to load month totals.",
        });

        if (!isActive || data === null) {
          return;
        }

        const nextTotals = data.reduce((totals, month) => {
          totals[month.month_key] = month.total_income;
          return totals;
        }, {});

        setMonthTotals(nextTotals);
      } catch {
        if (isActive) {
          setMonthTotals({});
        }
      }
    };

    loadMonthOverview();

    return () => {
      isActive = false;
    };
  }, [token, onUnauthorized, monthTotalsVersion, showReportControls]);

  useEffect(() => {
    let isActive = true;

    const loadCompanySettings = async () => {
      try {
        const data = await fetchProtectedJson("/api/company-settings/", {
          token,
          onUnauthorized,
          fallbackMessage: "Failed to load company settings.",
        });

        if (!isActive || data === null) {
          return;
        }

        setCompanySettings(data);
      } catch {
        if (isActive) {
          setCompanySettings(null);
        }
      }
    };

    loadCompanySettings();

    return () => {
      isActive = false;
    };
  }, [token, onUnauthorized, settingsVersion]);

  const handleStepMonth = (direction) => {
    const nextIndex = selectedMonthIndex + direction;

    if (nextIndex < 0 || nextIndex >= MONTH_OPTIONS.length) {
      return;
    }

    onMonthChange(MONTH_OPTIONS[nextIndex].key);
  };

  const handleImportClick = () => {
    setImportMessage("");
    setImportError("");
    fileInputRef.current?.click();
  };

  const handleClearMonth = async () => {
    const warning = `This will permanently delete all income, expenses, and salaries for ${selectedMonthLabel}. Continue?`;
    const shouldClear = window.confirm(warning);

    if (!shouldClear) {
      return;
    }

    setImportMessage("");
    setImportError("");

    try {
      const result = await postProtectedAction("/api/clear-month/", {
        token,
        onUnauthorized,
        fallbackMessage: "Failed to clear the selected month.",
        query: { month: selectedMonth },
      });

      if (result) {
        const deleted = result.deleted;
        setImportMessage(
          `Cleared ${result.month}: removed ${deleted.income} income, ${deleted.expense} expenses, and ${deleted.salary} salaries.`,
        );
        onDataImported();
      }
    } catch (actionError) {
      setImportError(actionError.message);
    }
  };

  const handleDownloadTemplate = () => {
    const templateRows = [
      "month,description,labor,spare parts,record type,amount,employee name,salary type,commission percent",
      "2026-03,Brake repair,150,500,income,,,,",
      "2026-03,Shop rent,,,expense,1200,,,",
      "2026-03,,,,salary,800,Ahmed,fixed,",
      "2026-03,,,,salary,,Ali,commission,20",
    ];
    const csvContent = `\uFEFF${templateRows.join("\n")}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "monthly_import_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsImporting(true);
    setImportMessage("");
    setImportError("");

    try {
      const result = await uploadProtectedFile("/api/import-monthly-csv/", {
        token,
        onUnauthorized,
        fallbackMessage: "Failed to import the CSV file.",
        file,
        query: { month: selectedMonth },
      });

      if (result) {
        const imported = result.imported;
        const importedMonths = result.months?.join(", ") || "multiple months";
        setImportMessage(
          `Imported ${imported.income} income, ${imported.expense} expenses, and ${imported.salary} salaries across ${importedMonths}.`,
        );
        onDataImported();
      }
    } catch (uploadError) {
      setImportError(uploadError.message);
    } finally {
      event.target.value = "";
      setIsImporting(false);
    }
  };

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebar-brand">
          <span className="app-sidebar-badge">
            {companySettings?.logo_url ? (
              <img
                src={companySettings.logo_url}
                alt={companyName}
                className="app-sidebar-logo"
              />
            ) : (
              companyInitials
            )}
          </span>
          <div>
            <p className="app-eyebrow">{companyName}</p>
            <h1 className="app-title">Workspace</h1>
          </div>
        </div>

        <nav className="app-nav" aria-label="Primary">
          <NavLink to="/" end className={navClassName}>
            Dashboard
          </NavLink>
          <NavLink to="/income" className={navClassName}>
            Income
          </NavLink>
          <NavLink to="/expense" className={navClassName}>
            Expenses
          </NavLink>
          {canAccessSalaries && (
            <NavLink to="/salaries" className={navClassName}>
              Salaries
            </NavLink>
          )}
          {canAccessReports && (
            <NavLink to="/reports" className={navClassName}>
              Reports
            </NavLink>
          )}
          {canManageProtectedActions && (
            <NavLink to="/settings" className={navClassName}>
              Settings
            </NavLink>
          )}
        </nav>

        <div className="app-sidebar-footer">
          <button type="button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div>
            <p className="app-eyebrow">Workspace</p>
            <h2 className="app-section-title">{routeTitle}</h2>
          </div>
          <div className="app-header-actions">
            {canManageProtectedActions && (
              <NavLink to="/settings" className="app-header-link">
                Profile
              </NavLink>
            )}
          </div>
        </header>

        {showReportControls && (
        <section className="month-panel" aria-label="Month selector">
          <div className="month-panel-header">
            <button
              type="button"
              className="month-nav-button"
              onClick={() => handleStepMonth(-1)}
              disabled={selectedMonthIndex <= 0}
            >
              ←
            </button>

            <div className="month-current">
              <span className="month-current-label">Viewing</span>
              <strong>{selectedMonthLabel}</strong>
            </div>

            <button
              type="button"
              className="month-nav-button"
              onClick={() => handleStepMonth(1)}
              disabled={selectedMonthIndex >= MONTH_OPTIONS.length - 1}
            >
              →
            </button>

            <button
              type="button"
              className="secondary-button month-toggle-button"
              onClick={() => setIsMonthPanelOpen((current) => !current)}
            >
              {isMonthPanelOpen ? "Hide Months" : "Choose Month"}
            </button>

            {canManageProtectedActions && (
              <button
                type="button"
                className="secondary-button month-toggle-button"
                onClick={handleImportClick}
                disabled={isImporting}
              >
                {isImporting ? "Importing..." : "Import CSV"}
              </button>
            )}

            <button
              type="button"
              className="secondary-button month-toggle-button"
              onClick={handleDownloadTemplate}
            >
              Download Template
            </button>

            {canManageProtectedActions && (
              <button
                type="button"
                className="danger-button month-toggle-button"
                onClick={handleClearMonth}
              >
                Clear Month
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden-file-input"
              onChange={handleImportChange}
            />
          </div>

          {importMessage && <p className="status-message success">{importMessage}</p>}
          {importError && <p className="status-message error">{importError}</p>}

          {isMonthPanelOpen &&
            MONTH_GROUPS.map((group) => (
              <div key={group.year} className="month-group">
                <p className="month-group-title">{group.year}</p>
                <div className="month-grid">
                  {group.months.map((month) => (
                    <button
                      key={month.key}
                      type="button"
                      className={
                        month.key === selectedMonth
                          ? "month-button active"
                          : "month-button"
                      }
                      onClick={() => onMonthChange(month.key)}
                    >
                      <span>{month.label}</span>
                      <small>{formatCurrency(monthTotals[month.key])}</small>
                    </button>
                  ))}
                </div>
              </div>
            ))}
        </section>
        )}

        <main className="app-content">
          <Outlet context={{ currentUserRole }} />
        </main>
      </div>
    </div>
  );
}
