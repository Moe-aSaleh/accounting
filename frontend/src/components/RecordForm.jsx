import { useState } from "react";

function getDefaultDate() {
  return new Date().toISOString().split("T")[0];
}

export default function RecordForm({
  title,
  nameLabel,
  namePlaceholder,
  nameKey,
  amountLabel = "Amount",
  onSubmit,
  initialValues,
  submitLabel = "Add Record",
  onCancel,
}) {
  const [values, setValues] = useState({
    [nameKey]: initialValues?.[nameKey] ?? "",
    amount: initialValues?.amount ?? "",
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
      await onSubmit(values);
      if (!initialValues) {
        setValues({
          [nameKey]: "",
          amount: "",
          date: getDefaultDate(),
        });
      }
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="sub-panel">
      <h3 className="sub-panel-title">{title}</h3>

      <form className="record-form" onSubmit={handleSubmit}>
        <label className="field-group">
          <span>{nameLabel}</span>
          <input
            name={nameKey}
            placeholder={namePlaceholder}
            value={values[nameKey]}
            onChange={handleChange}
            required
          />
        </label>

        <label className="field-group">
          <span>{amountLabel}</span>
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

        <label className="field-group">
          <span>Date</span>
          <input
            name="date"
            type="date"
            value={values.date}
            onChange={handleChange}
            required
          />
        </label>

        <button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="secondary-button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </form>

      {error && <p className="status-message error inline-error">{error}</p>}
    </section>
  );
}
