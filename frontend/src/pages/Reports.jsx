import { Fragment, useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { fetchProtectedJson } from "../lib/api";
import { formatCurrency } from "../lib/format";

function getCurrentYear() {
  return String(new Date().getFullYear());
}

export default function Reports({ onUnauthorized }) {
  const { currentUserRole = null } = useOutletContext();
  const yearCacheRef = useRef(new Map());
  const [selectedYear, setSelectedYear] = useState(getCurrentYear);
  const [availableYears, setAvailableYears] = useState([]);
  const [expandedMonthKey, setExpandedMonthKey] = useState(null);
  const [yearOverview, setYearOverview] = useState(null);
  const [yearError, setYearError] = useState("");
  const [loadingYear, setLoadingYear] = useState(true);
  const normalizedYear = /^\d{4}$/.test(selectedYear)
    ? selectedYear
    : getCurrentYear();
  const yearOptions = availableYears.length > 0 ? availableYears : [getCurrentYear()];
  const latestYear = yearOptions[0];

  useEffect(() => {
    if (currentUserRole === "staff" || currentUserRole === null) {
      return;
    }

    let isActive = true;

    const loadAvailableYears = async () => {
      try {
        const payload = await fetchProtectedJson("/api/available-years/", {
          onUnauthorized,
          fallbackMessage: "Failed to load available report years.",
        });

        if (!isActive || payload === null) {
          return;
        }

        const years = Array.isArray(payload.years)
          ? payload.years
              .map((year) => String(year))
              .filter((year) => /^\d{4}$/.test(year))
              .sort((left, right) => right.localeCompare(left))
          : [];
        const resolvedYears = years.length > 0 ? years : [getCurrentYear()];

        setAvailableYears(resolvedYears);
        setSelectedYear((current) =>
          resolvedYears.includes(current) ? current : resolvedYears[0],
        );
      } catch {
        if (isActive) {
          const fallbackYear = getCurrentYear();
          setAvailableYears([fallbackYear]);
          setSelectedYear((current) => (/^\d{4}$/.test(current) ? current : fallbackYear));
        }
      }
    };

    loadAvailableYears();

    return () => {
      isActive = false;
    };
  }, [onUnauthorized, currentUserRole]);

  useEffect(() => {
    if (currentUserRole === "staff" || currentUserRole === null) {
      return;
    }

    let isActive = true;

    const cachedYearOverview = yearCacheRef.current.get(normalizedYear);
    if (cachedYearOverview) {
      setYearOverview(cachedYearOverview);
      setYearError("");
      setLoadingYear(false);
      return () => {
        isActive = false;
      };
    }

    const loadYearOverview = async () => {
      setLoadingYear(true);

      try {
        const nextYearOverview = await fetchProtectedJson(
          "/api/year-overview/",
          {
            onUnauthorized,
            fallbackMessage: "Failed to load yearly report data.",
            query: { year: normalizedYear },
          },
        );

        if (!isActive || nextYearOverview === null) {
          return;
        }

        yearCacheRef.current.set(normalizedYear, nextYearOverview);
        setYearError("");
        setYearOverview(nextYearOverview);
        setExpandedMonthKey(null);
      } catch (fetchError) {
        if (isActive) {
          setYearError(fetchError.message);
        }
      } finally {
        if (isActive) {
          setLoadingYear(false);
        }
      }
    };

    loadYearOverview();

    return () => {
      isActive = false;
    };
  }, [onUnauthorized, normalizedYear, currentUserRole]);

  return (
    <section className="panel data-panel">
      <h2 className="section-title">Reports</h2>
      {currentUserRole === null ? (
        <p className="status-message">Loading...</p>
      ) : currentUserRole === "staff" ? (
        <p className="status-message error">
          Staff users cannot access reports.
        </p>
      ) : (
        <>
          <div className="dashboard-topbar">
            <div>
              <p className="status-message subtle report-intro">
                Click any month row to expand details for that month.
              </p>
            </div>
            <div className="dashboard-actions">
              <div className="report-year-control">
                <label className="field-group report-year-select">
                  <span>Year</span>
                  <select
                    value={normalizedYear}
                    onChange={(event) => setSelectedYear(event.target.value)}
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </label>
                {normalizedYear !== latestYear && (
                  <button
                    type="button"
                    className="secondary-button report-year-button"
                    onClick={() => setSelectedYear(latestYear)}
                  >
                    Latest Year
                  </button>
                )}
              </div>
            </div>
          </div>

          {yearError && <p className="status-message error">{yearError}</p>}
          {loadingYear && <p className="status-message">Loading...</p>}

          {!loadingYear && yearOverview && (
            <section className="sub-panel">
              <div className="chart-panel-header">
                <h3 className="sub-panel-title">
                  Year Overview - {yearOverview.year}
                </h3>
              </div>

              <div className="report-table-wrap">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Income</th>
                      <th>Expenses</th>
                      <th>Salaries</th>
                      <th>Net Profit</th>
                      <th>Closing Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearOverview.months.map((month) => {
                      const isExpanded = expandedMonthKey === month.month_key;

                      return (
                        <Fragment key={month.month_key}>
                          <tr
                            className={
                              isExpanded
                                ? "report-row-expanded"
                                : "report-row-clickable"
                            }
                            role="button"
                            tabIndex={0}
                            aria-expanded={isExpanded}
                            onClick={() =>
                              setExpandedMonthKey((current) =>
                                current === month.month_key
                                  ? null
                                  : month.month_key,
                              )
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setExpandedMonthKey((current) =>
                                  current === month.month_key
                                    ? null
                                    : month.month_key,
                                );
                              }
                            }}
                          >
                            <td>{month.month}</td>
                            <td>{formatCurrency(month.total_income)}</td>
                            <td>{formatCurrency(month.total_expense)}</td>
                            <td>{formatCurrency(month.total_salaries)}</td>
                            <td>{formatCurrency(month.net_profit)}</td>
                            <td>{formatCurrency(month.closing_balance)}</td>
                          </tr>
                          {isExpanded && (
                            <tr className="report-row-details">
                              <td colSpan={6}>
                                <div className="summary-grid">
                                  <article className="stat-card">
                                    <span className="stat-label">
                                      Opening Balance
                                    </span>
                                    <strong>
                                      {formatCurrency(month.opening_balance)}
                                    </strong>
                                  </article>
                                  <article className="stat-card">
                                    <span className="stat-label">
                                      Spare Parts Income
                                    </span>
                                    <strong>
                                      {formatCurrency(month.spare_parts_income)}
                                    </strong>
                                  </article>
                                  <article className="stat-card">
                                    <span className="stat-label">
                                      Labor Income
                                    </span>
                                    <strong>
                                      {formatCurrency(month.labor_income)}
                                    </strong>
                                  </article>
                                  <article className="stat-card">
                                    <span className="stat-label">Expenses</span>
                                    <strong>
                                      {formatCurrency(month.total_expense)}
                                    </strong>
                                  </article>
                                  <article className="stat-card">
                                    <span className="stat-label">Salaries</span>
                                    <strong>
                                      {formatCurrency(month.total_salaries)}
                                    </strong>
                                  </article>
                                  <article className="stat-card highlight">
                                    <span className="stat-label">
                                      Net Profit
                                    </span>
                                    <strong>
                                      {formatCurrency(month.net_profit)}
                                    </strong>
                                  </article>
                                  <article className="stat-card highlight">
                                    <span className="stat-label">
                                      Closing Balance
                                    </span>
                                    <strong>
                                      {formatCurrency(month.closing_balance)}
                                    </strong>
                                  </article>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </section>
  );
}
