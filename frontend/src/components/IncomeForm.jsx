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
    <section className="sub-panel">
      <h3 className="sub-panel-title">{title}</h3>

      <form className="record-form income-form" onSubmit={handleSubmit}>
        <div className="income-row income-row-top">
          <label className="field-group field-description">
            <span>Description</span>
            <input
              name="description"
              placeholder="Repair order"
              value={values.description}
              onChange={handleChange}
              required
            />
          </label>

          <label className="field-group field-amount">
            <span>Spare Parts</span>
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

          <label className="field-group field-amount">
            <span>Labor</span>
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

        <div className="income-row income-row-bottom">
          <label className="field-group field-date">
            <span>Date</span>
            <input
              name="date"
              type="date"
              value={values.date}
              onChange={handleChange}
              required
            />
          </label>

          <div className="sub-total-card">
            <span>Total Income</span>
            <strong>{formatCurrency(total)}</strong>
          </div>

          <div className="income-actions">
            <button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : submitLabel}
            </button>
            {onCancel && (
              <button type="button" className="secondary-button" onClick={onCancel}>
                Cancel
              </button>
            )}
          </div>
        </div>
      </form>

      {error && <p className="status-message error inline-error">{error}</p>}
    </section>
  );
}
