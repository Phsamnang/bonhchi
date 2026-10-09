"use client";

import React from "react";
import BonchiIcon from "./BonchiIcon";
import Pager from "./Pager";
import { formatUsd, formatKhr } from "@/lib/utils";
import { useProductPage, type Product } from "@/hooks/useMasterData";
import { usePagedSearch } from "@/hooks/usePagedSearch";

const SHOP_PAGE_SIZE = 15;
const OTHER_LIMIT = 6;

export interface SimpleCartItem {
  id?: string;
  product_id?: string | number;
  name: string;
  qty: number;
  unit: string;
  price: number;
  cur: "USD" | "KHR";
}

interface ProductPickerProps {
  /** The shop being bought from; may be missing for a shop typed in by hand */
  supplierId?: string | number;
  supplierName: string;
  currentItems?: SimpleCartItem[];
  onPick: (product: Product) => void;
}

/**
 * Pick a product for a market-trip shop: this shop's products a page at a time, plus —
 * only while searching — matches from other shops. Supports multi-adding items!
 */
export default function ProductPicker({
  supplierId,
  supplierName,
  currentItems = [],
  onPick,
}: ProductPickerProps) {
  const { search, setSearch, debouncedSearch, page, setPage } = usePagedSearch([supplierId]);

  const { data: shopData, isLoading: shopLoading, isFetching: shopFetching } = useProductPage(supplierId, {
    page,
    limit: SHOP_PAGE_SIZE,
    search: debouncedSearch,
    enabled: !!supplierId,
  });
  // Over-fetch so OTHER_LIMIT rows remain after dropping this shop's own matches
  const { data: otherData } = useProductPage(null, {
    page: 1,
    limit: OTHER_LIMIT + SHOP_PAGE_SIZE,
    search: debouncedSearch,
    enabled: debouncedSearch.length > 0,
  });

  const shopProds = shopData?.products ?? [];
  const otherProds = debouncedSearch
    ? (otherData?.products ?? []).filter((p) => String(p.supplier_id) !== String(supplierId)).slice(0, OTHER_LIMIT)
    : [];

  const getCartMatch = (p: Product) => {
    return currentItems.find(
      (it) =>
        (it.product_id && String(it.product_id) === String(p.id)) ||
        (it.name && it.name.trim().toLowerCase() === p.name.trim().toLowerCase())
    );
  };

  const row = (p: Product, own: boolean) => {
    const match = getCartMatch(p);
    const inCartQty = match ? match.qty : 0;

    return (
      <div
        key={p.id}
        onClick={() => onPick(p)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          border: inCartQty > 0 ? "1.5px solid var(--brand)" : own ? "1px solid var(--line-strong)" : "1px solid var(--line)",
          borderRadius: "10px",
          background: inCartQty > 0 ? "var(--brand-soft)" : own ? "var(--surface)" : "var(--surface-sunken)",
          padding: "10px 14px",
          transition: "all 0.15s ease",
          cursor: "pointer",
        }}
        className="hover:border-[var(--brand)] hover:shadow-xs"
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
          {!own && (
            <span className="bc-disc bc-disc-expense" style={{ width: 28, height: 28, flexShrink: 0 }}>
              <BonchiIcon name="cart" size={15} />
            </span>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <b style={{ fontSize: "14px", display: "block", color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {p.name}
            </b>
            <span className="p-muted" style={{ fontSize: "12px", display: "block" }}>
              {p.unit} · {p.cur === "USD" ? formatUsd(p.price) : formatKhr(p.price)}
              {!own && p.supplier_name && ` · 🏪 ${p.supplier_name}`}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <span className={`bc-cur bc-cur-${p.cur}`}>{p.cur}</span>

          {inCartQty > 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: "6px",
                  background: "var(--brand)",
                  color: "#fff",
                }}
              >
                ✓ {inCartQty} {p.unit}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPick(p);
                }}
                className="bc-btn bc-btn-secondary"
                style={{ minHeight: "30px", height: "30px", padding: "0 8px", fontSize: "12px", fontWeight: 700 }}
                title="បន្ថែម 1 ទៀត"
              >
                +1
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPick(p);
              }}
              className="bc-btn bc-btn-primary"
              style={{ minHeight: "32px", height: "32px", padding: "0 14px", fontSize: "12px", fontWeight: 700 }}
            >
              + រើសយក
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "14px" }}>
      <label className="w-search" style={{ width: "100%", padding: "6px 12px", background: "var(--surface)", border: "1px solid var(--line)" }}>
        <BonchiIcon name="search" size={16} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`ស្វែងរកទំនិញក្នុង ${supplierName}...`}
          style={{ fontSize: "13px" }}
          autoFocus
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--ink-muted)", padding: 0 }}
          >
            ✕
          </button>
        )}
      </label>

      {supplierId && (
        <>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--brand-dark)", textTransform: "uppercase", marginTop: "4px", display: "flex", justifyContent: "space-between" }}>
            <span>⭐ ទំនិញរបស់ហាង {supplierName}</span>
            {shopData && <span>({shopData.total} មុខ)</span>}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {shopProds.map((p) => row(p, true))}
          </div>

          {!shopLoading && shopProds.length === 0 && (
            <div className="p-muted" style={{ fontSize: "12px", padding: "10px 2px", textAlign: "center" }}>
              {debouncedSearch ? `រកមិនឃើញ “${debouncedSearch}” ក្នុងហាងនេះ` : "ហាងនេះមិនទាន់មានទំនិញក្នុងកាតាឡុកទេ"}
            </div>
          )}

          {shopLoading && (
            <div className="p-muted" style={{ fontSize: "12px", padding: "8px 2px", textAlign: "center" }}>
              កំពុងទាញទិន្នន័យ...
            </div>
          )}

          {shopData && shopData.totalPages > 1 && (
            <Pager
              compact
              page={page}
              totalPages={shopData.totalPages}
              total={shopData.total}
              shown={shopProds.length}
              pageSize={SHOP_PAGE_SIZE}
              onPage={setPage}
              loading={shopFetching}
            />
          )}
        </>
      )}

      {otherProds.length > 0 && (
        <>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginTop: "10px" }}>
            🔍 ពីហាងផ្សេងទៀត
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {otherProds.map((p) => row(p, false))}
          </div>
        </>
      )}

      {!supplierId && !debouncedSearch && (
        <div className="p-muted" style={{ fontSize: "12px", padding: "8px 2px", textAlign: "center" }}>
          វាយឈ្មោះទំនិញ ដើម្បីស្វែងរកពីហាងទាំងអស់
        </div>
      )}
    </div>
  );
}
