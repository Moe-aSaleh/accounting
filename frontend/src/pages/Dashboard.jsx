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

const YEAR_OPTIONS = ["2025", "2026"];

function getCurrentMonthNumber() {
  return new Date().toISOString().slice(5, 7);
}

function getCurrentYear() {
  const currentYear = new Date().getFullYear().toString();
  return YEAR_OPTIONS.includes(currentYear) ? currentYear : "2026";
}

export default function Dashboard({ token, onUnauthorized }) {
  const { currentUserRole = null } = useOutletContext();
  const canCreateRecords =
    currentUserRole === "owner" ||
    currentUserRole === "accountant" ||
    currentUserRole === "staff";
  const [selectedYear, setSelectedYear] = useState(getCurrentYear);
  const [selectedMonthNumber, setSelectedMonthNumber] = useState(getCurrentMonthNumber);
  const [summary, setSummary] = useState(null);
  const [yearOverview, setYearOverview] = useState(null);
  const [error, setError] = useState("");
  const [yearError, setYearError] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingYear, setLoadingYear] = useState(true);

  const selectedMonthKey = `${selectedYear}-${selectedMonthNumber}`;

  useEffect(() => {
    if (!token) {
      return;
    }

    let isActive = true;

    const loadSummary = async () => {
      setLoadingSummary(true);

      try {
        const nextSummary = await fetchProtectedJson("/api/summary/", {
          token,
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
  }, [token, onUnauthorized, selectedMonthKey]);

  useEffect(() => {
    if (!token) {
      return;
    }

    let isActive = true;

    const loadYearOverview = async () => {
      setLoadingYear(true);

      try {
        const nextYearOverview = await fetchProtectedJson("/api/year-overview/", {
          token,
          onUnauthorized,
          fallbackMessage: "Failed to load dashboard year data.",
          query: { year: selectedYear },
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
  }, [token, onUnauthorized, selectedYear]);

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

  return (
    <section className="panel data-panel">
      <div className="dashboard-topbar">
        <div>
          <h2 className="section-title">Dashboard</h2>
          <p className="status-message subtle dashboard-copy">
            Compare one month with its full year from the same screen.
          </p>
        </div>

        {canCreateRecords && (
          <div className="dashboard-actions">
            <Link to="/income?create=1" className="action-link-button">
              Add Income
            </Link>
            <Link to="/expense?create=1" className="action-link-button">
              Add Expense
            </Link>
          </div>
        )}
      </div>

      <section className="sub-panel dashboard-filter-panel">
        <div className="record-filter-grid">
          <label className="field-group">
            <span>Year</span>
            <select
              value={selectedYear}
              onChange={(event) => setSelectedYear(event.target.value)}
            >
              {YEAR_OPTIONS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group">
            <span>Month</span>
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
      </section>

      {error && <p className="status-message error">{error}</p>}

      {loadingSummary ? (
        <p className="status-message">Loading...</p>
      ) : summary ? (
        <div className="dashboard-dual-grid">
          <section className="sub-panel dashboard-side-panel">
            <div className="chart-panel-header">
              <h3 className="sub-panel-title">Selected Month</h3>
              <span className="chart-panel-meta">{summary.month}</span>
            </div>

            <div className="summary-grid dashboard-month-grid">
              <article className="stat-card">
                <span className="stat-label">Opening Balance</span>
                <strong>{formatCurrency(summary.opening_balance)}</strong>
              </article>
              <article className="stat-card">
                <span className="stat-label">Spare Parts</span>
                <strong>{formatCurrency(summary.spare_parts_income)}</strong>
              </article>
              <article className="stat-card">
                <span className="stat-label">Labor</span>
                <strong>{formatCurrency(summary.labor_income)}</strong>
              </article>
              <article className="stat-card">
                <span className="stat-label">Income</span>
                <strong>{formatCurrency(summary.total_income)}</strong>
              </article>
              <article className="stat-card">
                <span className="stat-label">Expenses</span>
                <strong>{formatCurrency(summary.total_expense)}</strong>
              </article>
              <article className="stat-card">
                <span className="stat-label">Salaries</span>
                <strong>{formatCurrency(summary.total_salaries)}</strong>
              </article>
              <article className="stat-card highlight">
                <span className="stat-label">Net Profit</span>
                <strong>{formatCurrency(summary.monthly_balance)}</strong>
              </article>
              <article className="stat-card highlight">
                <span className="stat-label">Closing Balance</span>
                <strong>{formatCurrency(summary.closing_balance)}</strong>
              </article>
            </div>

            {summary.has_manual_opening_balance && (
              <p className="status-message subtle">Manual opening balance is active for this month.</p>
            )}
          </section>

          <section className="sub-panel dashboard-side-panel">
            <div className="chart-panel-header">
              <h3 className="sub-panel-title">Selected Year</h3>
              <span className="chart-panel-meta">{selectedYear}</span>
            </div>

            {yearError && <p className="status-message error">{yearError}</p>}

            {loadingYear ? (
              <p className="status-message">Loading year overview...</p>
            ) : yearOverview ? (
              <>
                <div className="summary-grid dashboard-year-grid">
                  <article className="stat-card">
                    <span className="stat-label">Year Income</span>
                    <strong>{formatCurrency(yearTotals.income)}</strong>
                  </article>
                  <article className="stat-card">
                    <span className="stat-label">Year Expenses</span>
                    <strong>{formatCurrency(yearTotals.expenses)}</strong>
                  </article>
                  <article className="stat-card">
                    <span className="stat-label">Year Salaries</span>
                    <strong>{formatCurrency(yearTotals.salaries)}</strong>
                  </article>
                  <article className="stat-card highlight">
                    <span className="stat-label">Year Net Profit</span>
                    <strong>{formatCurrency(yearTotals.netProfit)}</strong>
                  </article>
                </div>

                <section className="sub-panel compact-sub-panel top-gap">
                  <div className="chart-panel-header">
                    <h3 className="sub-panel-title">Net Profit Trend</h3>
                    <span className="chart-panel-meta">{yearOverview.year}</span>
                  </div>

                  <div className="year-mini-chart">
                    {yearOverview.months.map((month) => {
                      const value = Number(month.net_profit || 0);
                      const heightPercent = Math.max(
                        (Math.abs(value) / highestNetProfit) * 100,
                        value !== 0 ? 6 : 0,
                      );

                      return (
                        <div key={month.month_key} className="year-mini-bar-group">
                          <div
                            className="year-mini-track"
                            title={`${month.month}: ${formatCurrency(value)}`}
                          >
                            <div
                              className={value >= 0 ? "year-mini-bar positive" : "year-mini-bar negative"}
                              style={{ height: `${heightPercent}%` }}
                            />
                          </div>
                          <span>{month.month.slice(0, 3)}</span>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <div className="report-table-wrap top-gap">
                  <table className="report-table">
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
                          <td>{formatCurrency(month.net_profit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="status-message">No year data available.</p>
            )}
          </section>
        </div>
      ) : (
        <p className="status-message">No data available.</p>
      )}
    </section>
  );
}
