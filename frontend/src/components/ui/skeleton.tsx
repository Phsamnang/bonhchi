import React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  circle?: boolean;
}

/**
 * Generic Skeleton block with fluid theme-aware shimmer effect
 */
export function Skeleton({ className, circle, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "bc-skeleton inline-block shrink-0",
        circle ? "rounded-full" : "rounded-md",
        className
      )}
      style={style}
      aria-hidden="true"
      {...props}
    />
  );
}

/**
 * 4-Card KPI Skeleton for Home & Reports
 */
export function KpiGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="w-kpis" aria-label="Loading KPIs...">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-kpi" style={{ minHeight: "115px", gap: "8px" }}>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for Merged Bank/Wallet balance cards
 */
export function WalletCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
        gap: "12px",
      }}
      aria-label="Loading wallet cards..."
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            padding: "16px",
            borderRadius: "16px",
            border: "1px solid var(--line)",
            background: "var(--surface-raised)",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Skeleton className="h-9 w-9" circle />
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for Recent Transactions / Ledger rows
 */
export function TransactionRowsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }} aria-label="Loading transactions...">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-tx"
          style={{
            pointerEvents: "none",
            borderBottom: "1px solid var(--line)",
            padding: "10px 0",
          }}
        >
          <Skeleton className="h-10 w-10 shrink-0" circle />
          <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="hide-m">
            <Skeleton className="h-4 w-12" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-14" />
          </div>
          <div className="hide-m">
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for standard HTML table rows
 */
export function TableRowsSkeleton({
  cols = 6,
  rows = 5,
  colWidths,
}: {
  cols?: number;
  rows?: number;
  colWidths?: string[];
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} style={{ height: "36px" }}>
          {Array.from({ length: cols }).map((_, cIdx) => (
            <td key={cIdx} style={{ padding: "6px 8px" }}>
              <Skeleton
                className="h-3.5"
                style={{
                  width: colWidths?.[cIdx] || (cIdx === 0 ? "24px" : cIdx === 1 ? "80%" : "60%"),
                  margin: cIdx === 0 ? "0 auto" : undefined,
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * Skeleton for Supplier / Shop list items
 */
export function SupplierCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }} aria-label="Loading suppliers...">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-card"
          style={{
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-md)",
            background: "var(--surface-raised)",
          }}
        >
          <Skeleton className="h-11 w-11 shrink-0" circle />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
            <Skeleton className="h-4 w-40" />
            <div style={{ display: "flex", gap: "10px" }}>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for Request items (Requests Page)
 */
export function RequestRowsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }} aria-label="Loading requests...">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-row p-card"
          style={{
            padding: "12px 14px",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-md)",
            background: "var(--surface-raised)",
          }}
        >
          <Skeleton className="h-10 w-10 shrink-0" circle />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "5px" }}>
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
