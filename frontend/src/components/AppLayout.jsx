import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  fetchProtectedJson,
  uploadProtectedFile,
} from "../lib/api";
import { formatCurrency } from "../lib/format";

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
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [monthTiles, setMonthTiles] = useState([]);
  const [monthTotals, setMonthTotals] = useState({});
  const [companySettings, setCompanySettings] = useState(null);
  const [importMessage, setImportMessage] = useState("");
  const [importError, setImportError] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);
  const navClassName = ({ isActive }) =>
    isActive ? "app-nav-link active" : "app-nav-link";
  const monthOptions = useMemo(() => {
    const options = [...monthTiles]
      .sort((left, right) => left.month_key.localeCompare(right.month_key))
      .map((tile) => ({
        key: tile.month_key,
        label: tile.label,
      }));

    if (options.length === 0) {
      return [{ key: selectedMonth, label: selectedMonth }];
    }

    if (!options.some((option) => option.key === selectedMonth)) {
      options.push({ key: selectedMonth, label: selectedMonth });
      options.sort((left, right) => left.key.localeCompare(right.key));
    }

    return options;
  }, [monthTiles, selectedMonth]);
  const monthGroups = useMemo(() => {
    const groups = new Map();

    monthOptions.forEach((monthOption) => {
      const year = Number(monthOption.key.split("-")[0]);
      if (!groups.has(year)) {
        groups.set(year, []);
      }
      groups.get(year).push(monthOption);
    });

    return [...groups.entries()]
      .sort((left, right) => left[0] - right[0])
      .map(([year, months]) => ({
        year,
        months: months.sort((left, right) => left.key.localeCompare(right.key)),
      }));
  }, [monthOptions]);
  const selectedMonthIndex = monthOptions.findIndex((month) => month.key === selectedMonth);
  const selectedMonthMatch = monthOptions.find((month) => month.key === selectedMonth);
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
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileNavOpen) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsMobileNavOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isMobileNavOpen]);

  useEffect(() => {
    if (!isMobileNavOpen) {
      document.body.style.removeProperty("overflow");
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.removeProperty("overflow");
    };
  }, [isMobileNavOpen]);

  useEffect(() => {
    if (!showReportControls) {
      setMonthTotals({});
      setMonthTiles([]);
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
        setMonthTiles(data);
      } catch {
        if (isActive) {
          setMonthTotals({});
          setMonthTiles([]);
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

    if (nextIndex < 0 || nextIndex >= monthOptions.length) {
      return;
    }

    onMonthChange(monthOptions[nextIndex].key);
  };

  const handleImportClick = () => {
    setImportMessage("");
    setImportError("");
    fileInputRef.current?.click();
  };

  const handleDownloadTemplate = () => {
    const templateRows = [
      "month,description,labor,spare parts,expense description,expense amount,employee,salary",
      "2026-03,Brake repair,150,500,Shop rent,1200,Ahmed,800",
      "2026-04,تصليح فرامل,250,700,إيجار الورشة,1200,محمد,3000",
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

  const handleDownloadArabicTemplate = () => {
    const templateRows = [
      "الشهر,التفاصيل,أجور يد,قطع غيار,تفاصيل المصاريف,المصروف,الموظف,الراتب",
      "2026-03,تصليح فرامل,250,700,إيجار الورشة,1200,محمد,3000",
      "2026-04,Brake repair,150,500,Shop rent,1200,Ahmed,800",
    ];
    const csvContent = `\uFEFF${templateRows.join("\n")}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "monthly_import_template_ar.csv";
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
      <div
        className={isMobileNavOpen ? "app-mobile-nav-overlay open" : "app-mobile-nav-overlay"}
        onClick={() => setIsMobileNavOpen(false)}
        aria-hidden={!isMobileNavOpen}
      />

      <aside className={isMobileNavOpen ? "app-sidebar open" : "app-sidebar"}>
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
          <button
            type="button"
            className="mobile-nav-close"
            aria-label="Close navigation menu"
            onClick={() => setIsMobileNavOpen(false)}
          >
            ×
          </button>
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
          <button
            type="button"
            className="mobile-nav-toggle"
            aria-label={isMobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMobileNavOpen}
            onClick={() => setIsMobileNavOpen((current) => !current)}
          >
            ☰
          </button>
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
              disabled={selectedMonthIndex >= monthOptions.length - 1}
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

            <button
              type="button"
              className="secondary-button month-toggle-button"
              onClick={handleDownloadArabicTemplate}
            >
              Download Arabic Template
            </button>

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
            monthGroups.map((group) => (
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
