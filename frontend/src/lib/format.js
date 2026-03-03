const currencyFormatter = new Intl.NumberFormat("en-AE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value) {
  const amount = Number(value || 0);
  return `AED ${currencyFormatter.format(amount)}`;
}
