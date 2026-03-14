import { useState } from "react";
import { formatCurrency } from "../lib/format";

function getDefaultDate() {
  return new Date().toISOString().split("T")[0];
}

export default function SalaryForm({
  laborIncome,
  onSubmit,
  initialValues,
  title = "Add Salary",
  submitLabel = "Add Salary",
  onCancel,
}) {
  const [values, setValues] = useState({
    employee_name: initialValues?.employee_name ?? "",
    salary_type: initialValues?.salary_type ?? "fixed",
    amount: initialValues?.salary_type === "commission" ? "" : initialValues?.amount ?? "",
    commission_base: initialValues?.commission_base || "labor",
    commission_percentage: initialValues?.commission_percentage ?? "",
    date: initialValues?.date ?? getDefaultDate(),
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setValues((currentValues) => {
      const nextValues = {
        ...currentValues,
        [name]: value,
      };

      if (name === "salary_type" && value === "fixed") {
        nextValues.commission_base = "labor";
        nextValues.commission_percentage = "";
      }

      if (name === "salary_type" && value === "commission") {
        nextValues.amount = "";
      }

      return nextValues;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const payload =
        values.salary_type === "commission"
          ? {
              employee_name: values.employee_name,
              salary_type: "commission",
              commission_base: "labor",
              commission_percentage: values.commission_percentage || "0",
              date: values.date,
            }
          : {
              employee_name: values.employee_name,
              salary_type: "fixed",
              amount: values.amount || "0",
              commission_base: "",
              commission_percentage: null,
              date: values.date,
            };

      await onSubmit(payload);

      if (!initialValues) {
        setValues({
          employee_name: "",
          salary_type: "fixed",
          amount: "",
          commission_base: "labor",
          commission_percentage: "",
          date: getDefaultDate(),
        });
      }
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const commissionAmount =
    (Number(laborIncome || 0) * Number(values.commission_percentage || 0)) / 100;

  return (
    <div className="ws-card">
      <div className="ws-card-head">
        <h3 className="ws-card-title">{title}</h3>
      </div>

      <form className="ws-salary-form" onSubmit={handleSubmit}>
        <label className="ws-field ws-span-2">
          <span className="ws-label">Employee</span>
          <input
            name="employee_name"
            placeholder="Employee name"
            value={values.employee_name}
            onChange={handleChange}
            required
          />
        </label>

        <label className="ws-field">
          <span className="ws-label">Salary Type</span>
          <select
            name="salary_type"
            value={values.salary_type}
            onChange={handleChange}
          >
            <option value="fixed">Fixed</option>
            <option value="commission">Commission</option>
          </select>
        </label>

        <label className="ws-field">
          <span className="ws-label">Date</span>
          <input
            name="date"
            type="date"
            value={values.date}
            onChange={handleChange}
            required
          />
        </label>

        {values.salary_type === "fixed" ? (
          <label className="ws-field">
            <span className="ws-label">Amount</span>
            <input
              name="amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={values.amount}
              onChange={handleChange}
              required
            />
          </label>
        ) : (
          <>
            <div className="ws-commission-row">
              <label className="ws-field">
                <span className="ws-label">Commission On</span>
                <input value="Labor Sales" readOnly />
              </label>

              <label className="ws-field">
                <span className="ws-label">Percentage (%)</span>
                <input
                  name="commission_percentage"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={values.commission_percentage}
                  onChange={handleChange}
                  required
                />
              </label>
            </div>

            <div className="ws-commission-preview">
              <span className="ws-commission-preview-label">Labor Income This Month</span>
              <strong className="ws-commission-preview-value">{formatCurrency(laborIncome)}</strong>
              <span className="ws-commission-preview-label">Commission Salary</span>
              <strong className="ws-commission-preview-value">{formatCurrency(commissionAmount)}</strong>
            </div>
          </>
        )}

        <div className="ws-span-all ws-form-actions">
          <button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <span className="ws-spinner" aria-hidden="true" />
                <span>Saving...</span>
              </>
            ) : (
              submitLabel
            )}
          </button>
          {onCancel && (
            <button type="button" className="ws-btn-ghost" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {error && <p className="ws-msg error">{error}</p>}
    </div>
  );
}
