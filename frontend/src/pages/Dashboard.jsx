import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { fetchProtectedJson } from "../lib/api";
import { formatCurrency } from "../lib/format";

const MONTH_OPTIONS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

function getCurrentMonthNumber() {
  return new Date().toISOString().slice(5, 7);
}

function getCurrentYear() {
  return new Date().getFullYear().toString();
}

function hasMonthActivity(summary) {
  if (!summary) {
    return false;
  }

  return (
    Number(summary.total_income || 0) > 0 ||
    Number(summary.total_expense || 0) > 0 ||
    Number(summary.total_salaries || 0) > 0
  );
}

export default function Dashboard({ onUnauthorized }) {
  const { currentUserRole = null } = useOutletContext();
  const canCreateRecords =
    currentUserRole === "owner" ||
    currentUserRole === "accountant" ||
    currentUserRole === "staff";
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(getCurrentYear);
  const [selectedMonthNumber, setSelectedMonthNumber] = useState(getCurrentMonthNumber);
  const [summary, setSummary] = useState(null);
  const [yearOverview, setYearOverview] = useState(null);
  const [error, setError] = useState("");
  const [yearError, setYearError] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingYear, setLoadingYear] = useState(true);

  const normalizedYear = /^\d{4}$/.test(selectedYear) ? selectedYear : getCurrentYear();
  const yearOptions = availableYears.length > 0 ? availableYears : [getCurrentYear()];
  const selectedMonthKey = `${normalizedYear}-${selectedMonthNumber}`;
  const selectedYearNumber = Number(normalizedYear);

  useEffect(() => {
    let isActive = true;

    const loadAvailableYears = async () => {
      try {
        const payload = await fetchProtectedJson("/api/available-years/", {
          onUnauthorized,
          fallbackMessage: "Failed to load available years.",
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
  }, [onUnauthorized]);

  useEffect(() => {
    let isActive = true;

    const loadSummary = async () => {
      setLoadingSummary(true);

      try {
        const nextSummary = await fetchProtectedJson("/api/summary/", {
          onUnauthorized,
          fallbackMessage: "Failed to load dashboard month data.",
          query: { month: selectedMonthKey },
        });

        if (!isActive || nextSummary === null) {
          return;
        }

        setError("");
        setSummary(nextSummary);
      } catch (fetchError) {
        if (isActive) {
          setError(fetchError.message);
          setSummary(null);
        }
      } finally {
        if (isActive) {
          setLoadingSummary(false);
        }
      }
    };

    loadSummary();

    return () => {
      isActive = false;
    };
  }, [onUnauthorized, selectedMonthKey]);

  useEffect(() => {
    let isActive = true;

    const loadYearOverview = async () => {
      setLoadingYear(true);

      try {
        const nextYearOverview = await fetchProtectedJson("/api/year-overview/", {
          onUnauthorized,
          fallbackMessage: "Failed to load dashboard year data.",
          query: { year: selectedYearNumber },
        });

        if (!isActive || nextYearOverview === null) {
          return;
        }

        setYearError("");
        setYearOverview(nextYearOverview);
      } catch (fetchError) {
        if (isActive) {
          setYearError(fetchError.message);
          setYearOverview(null);
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
  }, [onUnauthorized, selectedYearNumber]);

  const yearTotals =
    yearOverview?.months.reduce(
      (totals, month) => ({
        income: totals.income + Number(month.total_income || 0),
        expenses: totals.expenses + Number(month.total_expense || 0),
        salaries: totals.salaries + Number(month.total_salaries || 0),
        netProfit: totals.netProfit + Number(month.net_profit || 0),
      }),
      { income: 0, expenses: 0, salaries: 0, netProfit: 0 },
    ) || { income: 0, expenses: 0, salaries: 0, netProfit: 0 };

  const highestNetProfit = useMemo(() => {
    const maxValue =
      yearOverview?.months.reduce(
        (currentMax, month) => Math.max(currentMax, Math.abs(Number(month.net_profit || 0))),
        0,
      ) || 0;

    return maxValue || 1;
  }, [yearOverview]);

  const monthHasActivity = hasMonthActivity(summary);

  return (
    <div className="ws-page">
      <div className="ws-page-head">
        <div>
          <h2 className="ws-page-title">Dashboard</h2>
          <p className="ws-page-desc">Compare one month with its full year from the same screen.</p>
        </div>

        {canCreateRecords && (
          <div className="ws-page-ctas">
            <Link to="/income?create=1" className="ws-cta-link">
              + Add Income
            </Link>
            <Link to="/expense?create=1" className="ws-cta-link" style={{ background: "transparent", borderColor: "var(--border-2)", color: "var(--text-2)" }}>
              + Add Expense
            </Link>
          </div>
        )}
      </div>

      <div className="ws-card">
        <div className="ws-month-filter-grid">
          <label className="ws-field">
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

          <label className="ws-field">
            <span className="ws-label">Month</span>
            <select
              value={selectedMonthNumber}
              onChange={(event) => setSelectedMonthNumber(event.target.value)}
            >
              {MONTH_OPTIONS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error && <p className="ws-msg error">{error}</p>}

      {loadingSummary ? (
        <p className="ws-msg">Loading...</p>
      ) : summary ? (
        <div className="ws-dual-grid">
          <div className="ws-card">
            <div className="ws-card-head">
              <h3 className="ws-card-title">Selected Month</h3>
              <span className="ws-card-meta">{summary.month}</span>
            </div>

            {monthHasActivity ? (
              <div className="ws-stats ws-month-stats">
                <article className="ws-stat">
                  <span className="ws-stat-label">Opening Balance</span>
                  <strong className="ws-stat-value">{formatCurrency(summary.opening_balance)}</strong>
                </article>
                <article className="ws-stat">
                  <span className="ws-stat-label">Spare Parts</span>
                  <strong className="ws-stat-value">{formatCurrency(summary.spare_parts_income)}</strong>
                </article>
                <article className="ws-stat">
                  <span className="ws-stat-label">Labor</span>
                  <strong className="ws-stat-value">{formatCurrency(summary.labor_income)}</strong>
                </article>
                <article className="ws-stat">
                  <span className="ws-stat-label">Income</span>
                  <strong className="ws-stat-value">{formatCurrency(summary.total_income)}</strong>
                </article>
                <article className="ws-stat">
                  <span className="ws-stat-label">Expenses</span>
                  <strong className="ws-stat-value">{formatCurrency(summary.total_expense)}</strong>
                </article>
                <article className="ws-stat">
                  <span className="ws-stat-label">Salaries</span>
                  <strong className="ws-stat-value">{formatCurrency(summary.total_salaries)}</strong>
                </article>
                <article className={`ws-stat hl${Number(summary.monthly_balance) < 0 ? " neg" : ""}`}>
                  <span className="ws-stat-label">Net Profit</span>
                  <strong className="ws-stat-value">{formatCurrency(summary.monthly_balance)}</strong>
                </article>
                <article className={`ws-stat hl${Number(summary.closing_balance) < 0 ? " neg" : ""}`}>
                  <span className="ws-stat-label">Closing Balance</span>
                  <strong className="ws-stat-value">{formatCurrency(summary.closing_balance)}</strong>
                </article>
              </div>
            ) : (
              <div className="ws-empty">
                <h4>No activity recorded</h4>
                <p>
                  There is no income, expense, or salary activity for {summary.month} yet.
                </p>
                <div className="ws-empty-metrics">
                  <span>Opening Balance: {formatCurrency(summary.opening_balance)}</span>
                  <span>Closing Balance: {formatCurrency(summary.closing_balance)}</span>
                </div>
              </div>
            )}

            {summary.has_manual_opening_balance && (
              <p className="ws-msg subtle">Manual opening balance is active for this month.</p>
            )}
          </div>

          <div className="ws-card">
            <div className="ws-card-head">
              <h3 className="ws-card-title">Selected Year</h3>
              <span className="ws-card-meta">{normalizedYear}</span>
            </div>

            {yearError && <p className="ws-msg error">{yearError}</p>}

            {loadingYear ? (
              <p className="ws-msg">Loading year overview...</p>
            ) : yearOverview ? (
              <>
                <div className="ws-stats ws-year-stats">
                  <article className="ws-stat">
                    <span className="ws-stat-label">Year Income</span>
                    <strong className="ws-stat-value">{formatCurrency(yearTotals.income)}</strong>
                  </article>
                  <article className="ws-stat">
                    <span className="ws-stat-label">Year Expenses</span>
                    <strong className="ws-stat-value">{formatCurrency(yearTotals.expenses)}</strong>
                  </article>
                  <article className="ws-stat">
                    <span className="ws-stat-label">Year Salaries</span>
                    <strong className="ws-stat-value">{formatCurrency(yearTotals.salaries)}</strong>
                  </article>
                  <article className={`ws-stat hl${yearTotals.netProfit < 0 ? " neg" : ""}`}>
                    <span className="ws-stat-label">Year Net Profit</span>
                    <strong className="ws-stat-value">{formatCurrency(yearTotals.netProfit)}</strong>
                  </article>
                </div>

                <div className="ws-card" style={{ marginTop: "16px", padding: "14px" }}>
                  <div className="ws-card-head">
                    <h3 className="ws-card-title">Net Profit Trend</h3>
                    <span className="ws-card-meta">{yearOverview.year}</span>
                  </div>

                  <div className="ws-barchart">
                    {yearOverview.months.map((month) => {
                      const value = Number(month.net_profit || 0);
                      const heightPercent = Math.max(
                        (Math.abs(value) / highestNetProfit) * 100,
                        value !== 0 ? 6 : 0,
                      );

                      return (
                        <div key={month.month_key} className="ws-bar-col">
                          <div
                            className="ws-bar-track"
                            title={`${month.month}: ${formatCurrency(value)}`}
                          >
                            <div
                              className={value >= 0 ? "ws-bar pos" : "ws-bar neg"}
                              style={{ height: `${heightPercent}%` }}
                            />
                          </div>
                          <span className="ws-bar-lbl">{month.month.slice(0, 3)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="ws-report-wrap" style={{ marginTop: "16px" }}>
                  <table className="ws-report-table">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Income</th>
                        <th>Net Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {yearOverview.months.map((month) => (
                        <tr key={month.month_key}>
                          <td>{month.month}</td>
                          <td>{formatCurrency(month.total_income)}</td>
                          <td className={Number(month.net_profit) < 0 ? "ws-td-neg" : ""}>{formatCurrency(month.net_profit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="ws-msg">No year data available.</p>
            )}
          </div>
        </div>
      ) : (
        <p className="ws-msg">No data available.</p>
      )}
    </div>
  );
}
