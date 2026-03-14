export default function RecordToolbar({
  searchValue,
  onSearchChange,
  sortValue,
  onSortChange,
  pageSize,
  onPageSizeChange,
  searchPlaceholder,
}) {
  return (
    <div className="ws-search-row">
      <label className="ws-field">
        <span className="ws-label">Search</span>
        <input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
        />
      </label>

      <label className="ws-field">
        <span className="ws-label">Sort</span>
        <select value={sortValue} onChange={(event) => onSortChange(event.target.value)}>
          <option value="date-desc">Newest Date</option>
          <option value="date-asc">Oldest Date</option>
          <option value="amount-desc">Highest Amount</option>
          <option value="amount-asc">Lowest Amount</option>
          <option value="name-asc">Name A–Z</option>
          <option value="name-desc">Name Z–A</option>
        </select>
      </label>

      <label className="ws-field">
        <span className="ws-label">Rows Per Page</span>
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </label>
    </div>
  );
}
