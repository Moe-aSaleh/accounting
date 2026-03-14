import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  fetchProtectedJson,
  uploadProtectedFile,
} from "../lib/api";

export default function AppLayout({
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
    isActive ? "ws-nav-link active" : "ws-nav-link";
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
  }, [onUnauthorized, settingsVersion]);

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
    <div className="ws-shell">
      <div
        className={isMobileNavOpen ? "ws-overlay open" : "ws-overlay"}
        onClick={() => setIsMobileNavOpen(false)}
        aria-hidden={!isMobileNavOpen}
      />

      <aside className={isMobileNavOpen ? "ws-sidebar open" : "ws-sidebar"}>
        <div className="ws-brand">
          <span className="ws-brand-badge">
            {companySettings?.logo_url ? (
              <img
                src={companySettings.logo_url}
                alt={companyName}
                className="ws-brand-logo"
              />
            ) : (
              companyInitials
            )}
          </span>
          <div className="ws-brand-text">
            <p className="ws-brand-company">{companyName}</p>
            <h1 className="ws-brand-workspace">Workspace</h1>
          </div>
          <button
            type="button"
            className="ws-nav-close ws-btn-ghost"
            aria-label="Close navigation menu"
            onClick={() => setIsMobileNavOpen(false)}
          >
            ×
          </button>
        </div>

        <nav className="ws-nav" aria-label="Primary">
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

        <div className="ws-sidebar-foot">
          <button
            type="button"
            className="ws-btn-ghost ws-btn-wide"
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      </aside>

      <div className="ws-main">
        <header className="ws-header">
          <button
            type="button"
            className="ws-menu-toggle"
            aria-label={isMobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMobileNavOpen}
            onClick={() => setIsMobileNavOpen((current) => !current)}
          >
            ☰
          </button>
          <div className="ws-header-info">
            <p className="ws-header-breadcrumb">Workspace</p>
            <h2 className="ws-header-title">{routeTitle}</h2>
          </div>
          <div className="ws-header-actions">
            {canManageProtectedActions && (
              <NavLink to="/settings" className="ws-header-link">
                Profile
              </NavLink>
            )}
          </div>
        </header>

        {showReportControls && (
          <div className="ws-import-bar">
            <div className="ws-import-bar-label">
              <p>Data Tools</p>
              <strong>CSV Import &amp; Templates</strong>
            </div>

            {canManageProtectedActions && (
              <button
                type="button"
                className="ws-btn-ghost ws-btn-sm"
                onClick={handleImportClick}
                disabled={isImporting}
              >
                {isImporting ? "Importing..." : "Import CSV"}
              </button>
            )}

            <button
              type="button"
              className="ws-btn-ghost ws-btn-sm"
              onClick={handleDownloadTemplate}
            >
              Download Template
            </button>

            <button
              type="button"
              className="ws-btn-ghost ws-btn-sm"
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

            {importMessage && (
              <p className="ws-msg success" style={{ margin: 0 }}>
                {importMessage}
              </p>
            )}
            {importError && (
              <p className="ws-msg error" style={{ margin: 0 }}>
                {importError}
              </p>
            )}
          </div>
        )}

        <main className="ws-content">
          <Outlet context={{ currentUserRole }} />
        </main>
      </div>
    </div>
  );
}
