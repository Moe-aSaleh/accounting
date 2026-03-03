import { useEffect, useMemo, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import IncomeForm from "../components/IncomeForm";
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

export default function Income({ token, onUnauthorized, onIncomeChanged }) {
  const { currentUserRole = null } = useOutletContext();
  const canModifyRecords = currentUserRole !== "viewer";
  const [searchParams, setSearchParams] = useSearchParams();
  const [incomes, setIncomes] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [sortValue, setSortValue] = useState("date-desc");
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(searchParams.get("create") === "1");
  const [editingIncome, setEditingIncome] = useState(null);
  const [monthFilter, setMonthFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");

  useEffect(() => {
    setIsFormOpen(searchParams.get("create") === "1");
  }, [searchParams]);

  useEffect(() => {
    let isActive = true;

    const loadIncome = async () => {
      try {
        const data = await fetchProtectedJson("/api/income/", {
          token,
          onUnauthorized,
          fallbackMessage: "Failed to load income data.",
        });

        if (!isActive || data === null) {
          return;
        }

        setError("");
        setIncomes(data);
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

    loadIncome();

    return () => {
      isActive = false;
    };
  }, [token, onUnauthorized]);

  const yearOptions = useMemo(() => {
    const years = [...new Set(incomes.map((item) => item.date.slice(0, 4)))].sort((left, right) =>
      right.localeCompare(left),
    );
    return ["all", ...years];
  }, [incomes]);

  const handleCreateIncome = async (values) => {
    const createdIncome = await postProtectedJson("/api/income/", {
      token,
      onUnauthorized,
      fallbackMessage: "Failed to create income record.",
      body: values,
    });

    if (!createdIncome) {
      return;
    }

    setError("");
    setIncomes((currentIncomes) => [createdIncome, ...currentIncomes]);
    setCurrentPage(1);
    setIsFormOpen(false);
    setSearchParams({});
    onIncomeChanged();
  };

  const handleUpdateIncome = async (values) => {
    if (!editingIncome) {
      return;
    }

    const updatedIncome = await putProtectedJson(`/api/income/${editingIncome.id}/`, {
      token,
      onUnauthorized,
      fallbackMessage: "Failed to update income record.",
      body: values,
    });

    if (!updatedIncome) {
      return;
    }

    setError("");
    setEditingIncome(null);
    setCurrentPage(1);
    setIsFormOpen(false);
    setSearchParams({});
    setIncomes((currentIncomes) =>
      currentIncomes.map((item) => (item.id === updatedIncome.id ? updatedIncome : item)),
    );
    onIncomeChanged();
  };

  const handleDeleteIncome = async (incomeId) => {
    if (!window.confirm("Delete this income record?")) {
      return;
    }

    try {
      const deleted = await deleteProtected(`/api/income/${incomeId}/`, {
        token,
        onUnauthorized,
        fallbackMessage: "Failed to delete income record.",
      });

      if (!deleted) {
        return;
      }

      setError("");
      setEditingIncome((currentIncome) => (currentIncome?.id === incomeId ? null : currentIncome));
      if (editingIncome?.id === incomeId) {
        setIsFormOpen(false);
        setSearchParams({});
      }
      setIncomes((currentIncomes) => currentIncomes.filter((item) => item.id !== incomeId));
      setCurrentPage(1);
      onIncomeChanged();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const displayedIncomes = [...incomes]
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

      return [
        item.description,
        item.date,
        item.spare_parts_amount,
        item.labor_amount,
        item.amount,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search);
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

  const totalPages = Math.max(1, Math.ceil(displayedIncomes.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentPageItems = displayedIncomes.slice(startIndex, endIndex);

  return (
    <section className="panel data-panel">
      <h2 className="section-title">Income</h2>

      {canModifyRecords && (
        <div className="section-actions">
          <button
            type="button"
            onClick={() => {
              setEditingIncome(null);
              const nextOpen = !isFormOpen;
              setIsFormOpen(nextOpen);
              setSearchParams(nextOpen ? { create: "1" } : {});
            }}
          >
            {isFormOpen && !editingIncome ? "Hide Form" : "Create Income"}
          </button>
        </div>
      )}

      {canModifyRecords && isFormOpen && (
        <IncomeForm
          key={editingIncome ? `edit-income-${editingIncome.id}` : "create-income-current"}
          initialValues={editingIncome}
          title={editingIncome ? "Edit Income" : "Add Income"}
          submitLabel={editingIncome ? "Save Changes" : "Add Income"}
          onCancel={() => {
            setEditingIncome(null);
            setIsFormOpen(false);
            setSearchParams({});
          }}
          onSubmit={editingIncome ? handleUpdateIncome : handleCreateIncome}
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
        searchPlaceholder="Search income records"
      />

      {error && <p className="status-message error">{error}</p>}
      {loading && <p className="status-message">Loading...</p>}

      {!loading && displayedIncomes.length === 0 && !error && (
        <p className="status-message">No income records found.</p>
      )}

      <div className="record-table">
        <div className="record-table-header income-table-header">
          <span>Description</span>
          <span>Breakdown</span>
          <span>Total</span>
          <span>Actions</span>
        </div>

        <ul className="record-list">
          {currentPageItems.map((item) => (
            <li key={item.id} className="record-row income-record-row">
              <div className="record-cell">
                <span className="record-primary">{item.description}</span>
              </div>
              <div className="record-cell">
                <div className="record-main">
                  <small>{item.date}</small>
                  <small>
                    Parts: {formatCurrency(item.spare_parts_amount)} | Labor:{" "}
                    {formatCurrency(item.labor_amount)}
                  </small>
                </div>
              </div>
              <div className="record-cell record-amount-cell">
                <strong>{formatCurrency(item.amount)}</strong>
              </div>
              <div className="record-cell">
                <div className="record-actions">
                  {canModifyRecords && (
                    <>
                      <button
                        type="button"
                        className="secondary-button record-action-button"
                        onClick={() => {
                          setEditingIncome(item);
                          setIsFormOpen(true);
                          setSearchParams({ create: "1" });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="danger-button record-action-button"
                        onClick={() => handleDeleteIncome(item.id)}
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

      {displayedIncomes.length > 0 && (
        <div className="pagination-bar">
          <span className="pagination-summary">
            Showing {startIndex + 1}-{Math.min(endIndex, displayedIncomes.length)} of{" "}
            {displayedIncomes.length}
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
    </section>
  );
}
