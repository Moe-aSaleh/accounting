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
    <div className="ws-page">
      {currentUserRole === null ? (
        <p className="ws-msg">Loading...</p>
      ) : currentUserRole === "staff" ? (
        <p className="ws-msg error">Staff users cannot access reports.</p>
      ) : (
        <>
          <div className="ws-page-head">
            <div>
              <h2 className="ws-page-title">Reports</h2>
              <p className="ws-page-desc">Click any month row to expand details for that month.</p>
            </div>
            <div className="ws-report-controls">
              <label className="ws-field ws-report-year-select">
                <span className="ws-label">Year</span>
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
                  className="ws-btn-ghost ws-btn-sm"
                  onClick={() => setSelectedYear(latestYear)}
                  style={{ alignSelf: "flex-end" }}
                >
                  Latest Year
                </button>
              )}
            </div>
          </div>

          {yearError && <p className="ws-msg error">{yearError}</p>}
          {loadingYear && <p className="ws-msg">Loading...</p>}

          {!loadingYear && yearOverview && (
            <div className="ws-card">
              <div className="ws-card-head">
                <h3 className="ws-card-title">Year Overview</h3>
                <span className="ws-card-meta">{yearOverview.year}</span>
              </div>

              <div className="ws-report-wrap">
                <table className="ws-report-table">
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
                                ? "ws-report-row-expanded"
                                : "ws-report-row-clickable"
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
                            <td className={Number(month.net_profit) < 0 ? "ws-td-neg" : ""}>{formatCurrency(month.net_profit)}</td>
                            <td className={Number(month.closing_balance) < 0 ? "ws-td-neg" : ""}>{formatCurrency(month.closing_balance)}</td>
                          </tr>
                          {isExpanded && (
                            <tr className="ws-report-row-details">
                              <td colSpan={6}>
                                <div className="ws-stats">
                                  <article className={`ws-stat${Number(month.opening_balance) < 0 ? " neg" : ""}`}>
                                    <span className="ws-stat-label">Opening Balance</span>
                                    <strong className="ws-stat-value">
                                      {formatCurrency(month.opening_balance)}
                                    </strong>
                                  </article>
                                  <article className="ws-stat">
                                    <span className="ws-stat-label">Spare Parts Income</span>
                                    <strong className="ws-stat-value">
                                      {formatCurrency(month.spare_parts_income)}
                                    </strong>
                                  </article>
                                  <article className="ws-stat">
                                    <span className="ws-stat-label">Labor Income</span>
                                    <strong className="ws-stat-value">
                                      {formatCurrency(month.labor_income)}
                                    </strong>
                                  </article>
                                  <article className="ws-stat">
                                    <span className="ws-stat-label">Expenses</span>
                                    <strong className="ws-stat-value">
                                      {formatCurrency(month.total_expense)}
                                    </strong>
                                  </article>
                                  <article className="ws-stat">
                                    <span className="ws-stat-label">Salaries</span>
                                    <strong className="ws-stat-value">
                                      {formatCurrency(month.total_salaries)}
                                    </strong>
                                  </article>
                                  <article className={`ws-stat hl${Number(month.net_profit) < 0 ? " neg" : ""}`}>
                                    <span className="ws-stat-label">Net Profit</span>
                                    <strong className="ws-stat-value">
                                      {formatCurrency(month.net_profit)}
                                    </strong>
                                  </article>
                                  <article className={`ws-stat hl${Number(month.closing_balance) < 0 ? " neg" : ""}`}>
                                    <span className="ws-stat-label">Closing Balance</span>
                                    <strong className="ws-stat-value">
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
            </div>
          )}
        </>
      )}
    </div>
  );
}
