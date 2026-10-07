import React from "react";

interface PagerProps {
  page: number;
  totalPages: number;
  total: number;
  /** Rows on the current page (for "showing X – Y") */
  shown: number;
  pageSize: number;
  onPage: (page: number) => void;
  loading?: boolean;
  /** Unit after the total, e.g. "មុខ" */
  unit?: string;
  compact?: boolean;
}

/** "បង្ហាញ 21 – 40 នៃ 52 មុខ   ‹ មុន  2 / 3  បន្ទាប់ ›" — for server-paginated lists */
export default function Pager({
  page,
  totalPages,
  total,
  shown,
  pageSize,
  onPage,
  loading,
  unit = "មុខ",
  compact,
}: PagerProps) {
  if (total <= 0) return null;
  const first = (page - 1) * pageSize + 1;
  const btn: React.CSSProperties = {
    minHeight: compact ? "28px" : "32px",
    height: compact ? "28px" : "32px",
    padding: compact ? "0 10px" : "0 12px",
    fontSize: compact ? "12px" : "12.5px",
  };

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: compact ? "12px" : "12.5px",
      }}
    >
      <span className="p-muted">
        បង្ហាញ <b>{first}</b> – <b>{first + Math.max(0, shown - 1)}</b> នៃ <b>{total}</b> {unit}
        {loading && " · កំពុងផ្ទុក..."}
      </span>
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            type="button"
            className="bc-btn bc-btn-secondary"
            style={btn}
            disabled={page <= 1}
            onClick={() => onPage(Math.max(1, page - 1))}
          >
            ‹ មុន
          </button>
          <span style={{ fontWeight: 600, minWidth: "48px", textAlign: "center" }}>
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className="bc-btn bc-btn-secondary"
            style={btn}
            disabled={page >= totalPages}
            onClick={() => onPage(Math.min(totalPages, page + 1))}
          >
            បន្ទាប់ ›
          </button>
        </div>
      )}
    </div>
  );
}
