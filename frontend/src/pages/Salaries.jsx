import { useEffect, useMemo, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import SalaryForm from "../components/SalaryForm";
import RecordToolbar from "../components/RecordToolbar";
import {
  deleteProtected,
  fetchProtectedJson,
  postProtectedJson,
  putProtectedJson,
} from "../lib/api";
import { formatCurrency } from "../lib/format";

const MONTH_OPTIONS = [
  ["all", "All Months"],
  ["01", "January"],
  ["02", "February"],
  ["03", "March"],
  ["04", "April"],
  ["05", "May"],
  ["06", "June"],
  ["07", "July"],
  ["08", "August"],
  ["09", "September"],
  ["10", "October"],
  ["11", "November"],
  ["12", "December"],
];

function getCurrentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

export default function Salaries({ onUnauthorized }) {
  const { currentUserRole = null } = useOutletContext();
  const canAccessSalaries =
    currentUserRole === "owner" ||
    currentUserRole === "accountant" ||
    currentUserRole === "viewer";
  const canModifySalaries =
    currentUserRole === "owner" || currentUserRole === "accountant";
  const [searchParams, setSearchParams] = useSearchParams();
  const [salaries, setSalaries] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [laborIncome, setLaborIncome] = useState(0);
  const [searchValue, setSearchValue] = useState("");
  const [sortValue, setSortValue] = useState("date-desc");
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(searchParams.get("create") === "1");
  const [editingSalary, setEditingSalary] = useState(null);
  const [monthFilter, setMonthFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");

  useEffect(() => {
    setIsFormOpen(searchParams.get("create") === "1");
  }, [searchParams]);

  useEffect(() => {
    let isActive = true;

    const loadSalaries = async () => {
      try {
        const currentMonth = getCurrentMonthKey();
        const [salaryData, summary] = await Promise.all([
          fetchProtectedJson("/api/salaries/", {
            onUnauthorized,
            fallbackMessage: "Failed to load salary data.",
          }),
          fetchProtectedJson("/api/summary/", {
            onUnauthorized,
            fallbackMessage: "Failed to load salary calculation data.",
            query: { month: currentMonth },
          }),
        ]);

        if (!isActive || salaryData === null || summary === null) {
          return;
        }

        setError("");
        setSalaries(salaryData);
        setLaborIncome(summary.labor_income);
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

    loadSalaries();

    return () => {
      isActive = false;
    };
  }, [onUnauthorized]);

  const yearOptions = useMemo(() => {
    const years = [...new Set(salaries.map((item) => item.date.slice(0, 4)))].sort((left, right) =>
      right.localeCompare(left),
    );
    return ["all", ...years];
  }, [salaries]);

  const handleCreateSalary = async (values) => {
    const createdSalary = await postProtectedJson("/api/salaries/", {
      onUnauthorized,
      fallbackMessage: "Failed to create salary record.",
      body: values,
    });

    if (!createdSalary) {
      return;
    }

    setError("");
    setSalaries((currentSalaries) => [createdSalary, ...currentSalaries]);
    setCurrentPage(1);
    setIsFormOpen(false);
    setSearchParams({});
  };

  const handleUpdateSalary = async (values) => {
    if (!editingSalary) {
      return;
    }

    const updatedSalary = await putProtectedJson(`/api/salaries/${editingSalary.id}/`, {
      onUnauthorized,
      fallbackMessage: "Failed to update salary record.",
      body: values,
    });

    if (!updatedSalary) {
      return;
    }

    setError("");
    setEditingSalary(null);
    setCurrentPage(1);
    setIsFormOpen(false);
    setSearchParams({});
    setSalaries((currentSalaries) =>
      currentSalaries.map((item) => (item.id === updatedSalary.id ? updatedSalary : item)),
    );
  };

  const handleDeleteSalary = async (salaryId) => {
    if (!window.confirm("Delete this salary record?")) {
      return;
    }

    try {
      const deleted = await deleteProtected(`/api/salaries/${salaryId}/`, {
        onUnauthorized,
        fallbackMessage: "Failed to delete salary record.",
      });

      if (!deleted) {
        return;
      }

      setError("");
      setEditingSalary((currentSalary) => (currentSalary?.id === salaryId ? null : currentSalary));
      if (editingSalary?.id === salaryId) {
        setIsFormOpen(false);
        setSearchParams({});
      }
      setSalaries((currentSalaries) => currentSalaries.filter((item) => item.id !== salaryId));
      setCurrentPage(1);
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const displayedSalaries = [...salaries]
    .filter((item) => {
      if (monthFilter !== "all" && item.date.slice(5, 7) !== monthFilter) {
        return false;
      }

      if (yearFilter !== "all" && item.date.slice(0, 4) !== yearFilter) {
        return false;
      }

      const search = searchValue.trim().toLowerCase();

      if (!search) {
        return true;
      }

      return [item.employee_name, item.date, item.amount].join(" ").toLowerCase().includes(search);
    })
    .sort((left, right) => {
      if (sortValue === "date-asc") {
        return left.date.localeCompare(right.date);
      }

      if (sortValue === "date-desc") {
        return right.date.localeCompare(left.date);
      }

      if (sortValue === "amount-asc") {
        return Number(left.amount) - Number(right.amount);
      }

      if (sortValue === "amount-desc") {
        return Number(right.amount) - Number(left.amount);
      }

      if (sortValue === "name-desc") {
        return right.employee_name.localeCompare(left.employee_name);
      }

      return left.employee_name.localeCompare(right.employee_name);
    });

  const totalPages = Math.max(1, Math.ceil(displayedSalaries.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentPageItems = displayedSalaries.slice(startIndex, endIndex);

  return (
    <section className="panel data-panel">
      <h2 className="section-title">Salaries</h2>
      {currentUserRole === null ? (
        <p className="status-message">Loading...</p>
      ) : !canAccessSalaries ? (
        <p className="status-message error">You do not have permission to access salaries.</p>
      ) : (
        <>
      <p className="status-message subtle report-intro">
        Keep salaries as the actual amount paid each month. If a salary changes, save the new amount
        in the month it changes so older months stay correct.
      </p>

      {canModifySalaries && (
        <div className="section-actions">
          <button
            type="button"
            onClick={() => {
              setEditingSalary(null);
              const nextOpen = !isFormOpen;
              setIsFormOpen(nextOpen);
              setSearchParams(nextOpen ? { create: "1" } : {});
            }}
          >
            {isFormOpen && !editingSalary ? "Hide Form" : "Create Salary"}
          </button>
        </div>
      )}

      {canModifySalaries && isFormOpen && (
        <SalaryForm
          key={editingSalary ? `edit-salary-${editingSalary.id}` : "create-salary-current"}
          title={editingSalary ? "Edit Salary" : "Add Salary"}
          laborIncome={laborIncome}
          initialValues={editingSalary}
          submitLabel={editingSalary ? "Save Changes" : "Add Salary"}
          onCancel={() => {
            setEditingSalary(null);
            setIsFormOpen(false);
            setSearchParams({});
          }}
          onSubmit={editingSalary ? handleUpdateSalary : handleCreateSalary}
        />
      )}

      <div className="sub-panel toolbar-panel">
        <div className="record-filter-grid">
          <label className="field-group">
            <span>Month Filter</span>
            <select
              value={monthFilter}
              onChange={(event) => {
                setMonthFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              {MONTH_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group">
            <span>Year Filter</span>
            <select
              value={yearFilter}
              onChange={(event) => {
                setYearFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              {yearOptions.map((value) => (
                <option key={value} value={value}>
                  {value === "all" ? "All Years" : value}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <RecordToolbar
        searchValue={searchValue}
        onSearchChange={(value) => {
          setSearchValue(value);
          setCurrentPage(1);
        }}
        sortValue={sortValue}
        onSortChange={(value) => {
          setSortValue(value);
          setCurrentPage(1);
        }}
        pageSize={pageSize}
        onPageSizeChange={(value) => {
          setPageSize(value);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search salary records"
      />

      {error && <p className="status-message error">{error}</p>}
      {loading && <p className="status-message">Loading...</p>}

      {!loading && displayedSalaries.length === 0 && !error && (
        <p className="status-message">No salary records found.</p>
      )}

      <div className="record-table">
        <div className="record-table-header simple-table-header">
          <span>Employee</span>
          <span>Type</span>
          <span>Amount</span>
          <span>Actions</span>
        </div>

        <ul className="record-list">
          {currentPageItems.map((item) => (
            <li key={item.id} className="record-row simple-record-row">
              <div className="record-cell">
                <span className="record-primary">{item.employee_name}</span>
              </div>
              <div className="record-cell">
                <small>
                  {item.date} |{" "}
                  {item.salary_type === "commission"
                    ? `Commission ${item.commission_percentage}% on labor`
                    : "Fixed salary"}
                </small>
              </div>
              <div className="record-cell record-amount-cell">
                <strong>{formatCurrency(item.amount)}</strong>
              </div>
              <div className="record-cell">
                <div className="record-actions">
                  {canModifySalaries && (
                    <>
                      <button
                        type="button"
                        className="secondary-button record-action-button"
                        onClick={() => {
                          setEditingSalary(item);
                          setIsFormOpen(true);
                          setSearchParams({ create: "1" });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="danger-button record-action-button"
                        onClick={() => handleDeleteSalary(item.id)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {displayedSalaries.length > 0 && (
        <div className="pagination-bar">
          <span className="pagination-summary">
            Showing {startIndex + 1}-{Math.min(endIndex, displayedSalaries.length)} of{" "}
            {displayedSalaries.length}
          </span>
          <div className="pagination-actions">
            <button
              type="button"
              className="secondary-button"
              disabled={activePage <= 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              Previous
            </button>
            <span className="pagination-page">
              Page {activePage} of {totalPages}
            </span>
            <button
              type="button"
              className="secondary-button"
              disabled={activePage >= totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}
        </>
      )}
    </section>
  );
}
