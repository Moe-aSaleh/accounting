const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const MONTH_GROUPS = [2025, 2026].map((year) => ({
  year,
  months: MONTH_NAMES.map((label, index) => ({
    key: `${year}-${String(index + 1).padStart(2, "0")}`,
    label,
  })),
}));

export const MONTH_OPTIONS = MONTH_GROUPS.flatMap((group) => group.months);

export function getDefaultMonthKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  if (year === 2025 || year === 2026) {
    return `${year}-${month}`;
  }

  return "2026-01";
}
