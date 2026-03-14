import { useState } from "react";
import { formatCurrency } from "../lib/format";

function getDefaultDate() {
  return new Date().toISOString().split("T")[0];
}

export default function IncomeForm({
  onSubmit,
  initialValues,
  title = "Add Income",
  submitLabel = "Add Income",
  onCancel,
}) {
  const [values, setValues] = useState({
    description: initialValues?.description ?? "",
    spare_parts_amount: initialValues?.spare_parts_amount ?? "",
    labor_amount: initialValues?.labor_amount ?? "",
    date: initialValues?.date ?? getDefaultDate(),
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await onSubmit({
        ...values,
        spare_parts_amount: values.spare_parts_amount || "0",
        labor_amount: values.labor_amount || "0",
      });
      if (!initialValues) {
        setValues({
          description: "",
          spare_parts_amount: "",
          labor_amount: "",
          date: getDefaultDate(),
        });
      }
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const spareParts = Number(values.spare_parts_amount || 0);
  const labor = Number(values.labor_amount || 0);
  const total = spareParts + labor;

  return (
    <div className="ws-card">
      <div className="ws-card-head">
        <h3 className="ws-card-title">{title}</h3>
      </div>

      <form className="ws-income-form" onSubmit={handleSubmit}>
        <div className="ws-income-row-top">
          <label className="ws-field">
            <span className="ws-label">Description</span>
            <input
              name="description"
              placeholder="Repair order"
              value={values.description}
              onChange={handleChange}
              required
            />
          </label>

          <label className="ws-field">
            <span className="ws-label">Spare Parts</span>
            <input
              name="spare_parts_amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={values.spare_parts_amount}
              onChange={handleChange}
            />
          </label>

          <label className="ws-field">
            <span className="ws-label">Labor</span>
            <input
              name="labor_amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={values.labor_amount}
              onChange={handleChange}
            />
          </label>
        </div>

        <div className="ws-income-row-bottom">
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

          <div className="ws-total-card">
            <span className="ws-total-card-label">Total Income</span>
            <strong className="ws-total-card-value">{formatCurrency(total)}</strong>
          </div>

          <div className="ws-income-btns">
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
        </div>
      </form>

      {error && <p className="ws-msg error">{error}</p>}
    </div>
  );
}
