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
    <div className="ws-card">
      <div className="ws-card-head">
        <h3 className="ws-card-title">{title}</h3>
      </div>

      <form className="ws-form-stack" onSubmit={handleSubmit}>
        <label className="ws-field">
          <span className="ws-label">{nameLabel}</span>
          <input
            name={nameKey}
            placeholder={namePlaceholder}
            value={values[nameKey]}
            onChange={handleChange}
            required
          />
        </label>

        <label className="ws-field">
          <span className="ws-label">{amountLabel}</span>
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

        <div className="ws-form-actions">
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
