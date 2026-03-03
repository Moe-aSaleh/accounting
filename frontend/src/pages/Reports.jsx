import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { fetchProtectedJson } from "../lib/api";
import { formatCurrency } from "../lib/format";

export default function Reports({ token, onUnauthorized, selectedMonth }) {
  const { currentUserRole = null } = useOutletContext();
  const [summary, setSummary] = useState(null);
  const [yearOverview, setYearOverview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || currentUserRole === "staff" || currentUserRole === null) {
      return;
    }

    let isActive = true;

    const loadReports = async () => {
      try {
        const selectedYear = selectedMonth.split("-")[0];
        const [nextSummary, nextYearOverview] = await Promise.all([
          fetchProtectedJson("/api/summary/", {
            token,
            onUnauthorized,
            fallbackMessage: "Failed to load monthly report data.",
            query: { month: selectedMonth },
          }),
          fetchProtectedJson("/api/year-overview/", {
            token,
            onUnauthorized,
            fallbackMessage: "Failed to load yearly report data.",
            query: { year: selectedYear },
          }),
        ]);

        if (!isActive || nextSummary === null || nextYearOverview === null) {
          return;
        }

        setError("");
        setSummary(nextSummary);
        setYearOverview(nextYearOverview);
      } catch (fetchError) {
        if (isActive) {
          setError(fetchError.message);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadReports();

    return () => {
      isActive = false;
    };
  }, [token, onUnauthorized, selectedMonth, currentUserRole]);

  return (
    <section className="panel data-panel">
      <h2 className="section-title">Reports</h2>
      {currentUserRole === null ? (
        <p className="status-message">Loading...</p>
      ) : currentUserRole === "staff" ? (
        <p className="status-message error">Staff users cannot access reports.</p>
      ) : (
        <>
      <p className="status-message subtle report-intro">
        Review past months here. Use the month controls above to change the report period.
      </p>

      {error && <p className="status-message error">{error}</p>}
      {loading && <p className="status-message">Loading...</p>}

      {!loading && summary && (
        <>
          <section className="sub-panel">
            <div className="chart-panel-header">
              <h3 className="sub-panel-title">Selected Month Summary</h3>
              <span className="chart-panel-meta">{summary.month}</span>
            </div>

            <div className="summary-grid">
              <article className="stat-card">
                <span className="stat-label">Opening Balance</span>
                <strong>{formatCurrency(summary.opening_balance)}</strong>
              </article>
              <article className="stat-card">
                <span className="stat-label">Total Income</span>
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
          </section>

          {yearOverview && (
            <section className="sub-panel">
              <div className="chart-panel-header">
                <h3 className="sub-panel-title">Year Overview</h3>
                <span className="chart-panel-meta">{yearOverview.year}</span>
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
                    {yearOverview.months.map((month) => (
                      <tr key={month.month_key}>
                        <td>{month.month}</td>
                        <td>{formatCurrency(month.total_income)}</td>
                        <td>{formatCurrency(month.total_expense)}</td>
                        <td>{formatCurrency(month.total_salaries)}</td>
                        <td>{formatCurrency(month.net_profit)}</td>
                        <td>{formatCurrency(month.closing_balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
        </>
      )}
    </section>
  );
}
