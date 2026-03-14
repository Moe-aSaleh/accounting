import { useEffect, useMemo, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import RecordForm from "../components/RecordForm";
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

export default function Expense({ onUnauthorized }) {
  const { currentUserRole = null } = useOutletContext();
  const canModifyRecords = currentUserRole !== "viewer";
  const [searchParams, setSearchParams] = useSearchParams();
  const [expenses, setExpenses] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [sortValue, setSortValue] = useState("date-desc");
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(searchParams.get("create") === "1");
  const [editingExpense, setEditingExpense] = useState(null);
  const [monthFilter, setMonthFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");

  useEffect(() => {
    setIsFormOpen(searchParams.get("create") === "1");
  }, [searchParams]);

  useEffect(() => {
    let isActive = true;

    const loadExpenses = async () => {
      try {
        const data = await fetchProtectedJson("/api/expense/", {
          onUnauthorized,
          fallbackMessage: "Failed to load expense data.",
        });

        if (!isActive || data === null) {
          return;
        }

        setError("");
        setExpenses(data);
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

    loadExpenses();

    return () => {
      isActive = false;
    };
  }, [onUnauthorized]);

  const yearOptions = useMemo(() => {
    const years = [...new Set(expenses.map((item) => item.date.slice(0, 4)))].sort((left, right) =>
      right.localeCompare(left),
    );
    return ["all", ...years];
  }, [expenses]);

  const handleCreateExpense = async (values) => {
    const createdExpense = await postProtectedJson("/api/expense/", {
      onUnauthorized,
      fallbackMessage: "Failed to create expense record.",
      body: values,
    });

    if (!createdExpense) {
      return;
    }

    setError("");
    setExpenses((currentExpenses) => [createdExpense, ...currentExpenses]);
    setCurrentPage(1);
    setIsFormOpen(false);
    setSearchParams({});
  };

  const handleUpdateExpense = async (values) => {
    if (!editingExpense) {
      return;
    }

    const updatedExpense = await putProtectedJson(`/api/expense/${editingExpense.id}/`, {
      onUnauthorized,
      fallbackMessage: "Failed to update expense record.",
      body: values,
    });

    if (!updatedExpense) {
      return;
    }

    setError("");
    setEditingExpense(null);
    setCurrentPage(1);
    setIsFormOpen(false);
    setSearchParams({});
    setExpenses((currentExpenses) =>
      currentExpenses.map((item) => (item.id === updatedExpense.id ? updatedExpense : item)),
    );
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm("Delete this expense record?")) {
      return;
    }

    try {
      const deleted = await deleteProtected(`/api/expense/${expenseId}/`, {
        onUnauthorized,
        fallbackMessage: "Failed to delete expense record.",
      });

      if (!deleted) {
        return;
      }

      setError("");
      setEditingExpense((currentExpense) => (currentExpense?.id === expenseId ? null : currentExpense));
      if (editingExpense?.id === expenseId) {
        setIsFormOpen(false);
        setSearchParams({});
      }
      setExpenses((currentExpenses) => currentExpenses.filter((item) => item.id !== expenseId));
      setCurrentPage(1);
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const displayedExpenses = [...expenses]
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

      return [item.description, item.date, item.amount].join(" ").toLowerCase().includes(search);
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
        return right.description.localeCompare(left.description);
      }

      return left.description.localeCompare(right.description);
    });

  const totalPages = Math.max(1, Math.ceil(displayedExpenses.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentPageItems = displayedExpenses.slice(startIndex, endIndex);

  return (
    <div className="ws-page">
      <div className="ws-page-head">
        <h2 className="ws-page-title">Expenses</h2>
        {canModifyRecords && (
          <div className="ws-page-ctas">
            <button
              type="button"
              onClick={() => {
                setEditingExpense(null);
                const nextOpen = !isFormOpen;
                setIsFormOpen(nextOpen);
                setSearchParams(nextOpen ? { create: "1" } : {});
              }}
            >
              {isFormOpen && !editingExpense ? "Hide Form" : "Create Expense"}
            </button>
          </div>
        )}
      </div>

      {canModifyRecords && isFormOpen && (
        <RecordForm
          key={editingExpense ? `edit-expense-${editingExpense.id}` : "create-expense-current"}
          title={editingExpense ? "Edit Expense" : "Add Expense"}
          nameLabel="Description"
          namePlaceholder="Office rent"
          nameKey="description"
          initialValues={editingExpense}
          submitLabel={editingExpense ? "Save Changes" : "Add Expense"}
          onCancel={() => {
            setEditingExpense(null);
            setIsFormOpen(false);
            setSearchParams({});
          }}
          onSubmit={editingExpense ? handleUpdateExpense : handleCreateExpense}
        />
      )}

      <div className="ws-card">
        <div className="ws-toolbar">
          <div className="ws-filter-row">
            <label className="ws-field">
              <span className="ws-label">Month Filter</span>
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

            <label className="ws-field">
              <span className="ws-label">Year Filter</span>
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
            searchPlaceholder="Search expense records"
          />
        </div>

        {error && <p className="ws-msg error">{error}</p>}
        {loading && <p className="ws-msg">Loading...</p>}

        {!loading && displayedExpenses.length === 0 && !error && (
          <p className="ws-msg subtle">No expense records found.</p>
        )}

        <div className="ws-table-scroll">
          <div className="ws-list-header ws-simple-cols">
            <span>Description</span>
            <span>Date</span>
            <span>Amount</span>
            <span>Actions</span>
          </div>

          <ul className="ws-record-list">
            {currentPageItems.map((item) => (
              <li key={item.id} className="ws-simple-cols">
                <div className="ws-record-primary">{item.description}</div>
                <div className="ws-record-secondary">
                  <small>{item.date}</small>
                </div>
                <div className="ws-record-amount">
                  <strong className="ws-amount">{formatCurrency(item.amount)}</strong>
                </div>
                <div className="ws-record-actions">
                  {canModifyRecords && (
                    <>
                      <button
                        type="button"
                        className="ws-btn-ghost ws-btn-sm"
                        onClick={() => {
                          setEditingExpense(item);
                          setIsFormOpen(true);
                          setSearchParams({ create: "1" });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="ws-btn-danger ws-btn-sm"
                        onClick={() => handleDeleteExpense(item.id)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {displayedExpenses.length > 0 && (
          <div className="ws-pager">
            <span className="ws-pager-info">
              Showing {startIndex + 1}–{Math.min(endIndex, displayedExpenses.length)} of{" "}
              {displayedExpenses.length}
            </span>
            <div className="ws-pager-controls">
              <button
                type="button"
                className="ws-btn-ghost ws-btn-sm"
                disabled={activePage <= 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                Previous
              </button>
              <span className="ws-pager-label">
                Page {activePage} of {totalPages}
              </span>
              <button
                type="button"
                className="ws-btn-ghost ws-btn-sm"
                disabled={activePage >= totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
