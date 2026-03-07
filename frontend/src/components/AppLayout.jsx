import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  fetchProtectedJson,
  uploadProtectedFile,
} from "../lib/api";

export default function AppLayout({
  token,
  onLogout,
  onUnauthorized,
  settingsVersion,
  onDataImported,
}) {
  const location = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [companySettings, setCompanySettings] = useState(null);
  const [importMessage, setImportMessage] = useState("");
  const [importError, setImportError] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);
  const navClassName = ({ isActive }) =>
    isActive ? "app-nav-link active" : "app-nav-link";
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
        <section className="month-panel" aria-label="Report data tools">
          <div className="month-panel-header">
            <div className="month-current">
              <span className="month-current-label">Data Tools</span>
              <strong>CSV Import & Templates</strong>
            </div>

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
        </section>
        )}

        <main className="app-content">
          <Outlet context={{ currentUserRole }} />
        </main>
      </div>
    </div>
  );
}
