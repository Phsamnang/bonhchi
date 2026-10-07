"use client";

import React from "react";
import BonchiIcon from "./BonchiIcon";
import Pager from "./Pager";
import { formatUsd, formatKhr } from "@/lib/utils";
import { useProductPage, type Product } from "@/hooks/useMasterData";
import { usePagedSearch } from "@/hooks/usePagedSearch";

const SHOP_PAGE_SIZE = 15;
const OTHER_LIMIT = 6;

interface ProductPickerProps {
  /** The shop being bought from; may be missing for a shop typed in by hand */
  supplierId?: string | number;
  supplierName: string;
  onPick: (product: Product) => void;
}

/**
 * Pick a product for a market-trip shop: this shop's products a page at a time, plus —
 * only while searching — matches from other shops. Nothing loads the whole catalog.
 */
export default function ProductPicker({ supplierId, supplierName, onPick }: ProductPickerProps) {
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

  const row = (p: Product, own: boolean) => (
    <button
      key={p.id}
      type="button"
      className="bc-row"
      onClick={() => onPick(p)}
      style={{
        width: "100%",
        border: own ? "1.5px solid var(--brand)" : "1px solid var(--line)",
        borderRadius: "10px",
        background: own ? "var(--brand-soft)" : "var(--surface)",
        textAlign: "left",
        cursor: "pointer",
        padding: "8px 10px",
      }}
    >
      {!own && (
        <span className="bc-disc bc-disc-expense" style={{ width: 28, height: 28 }}>
          <BonchiIcon name="cart" size={15} />
        </span>
      )}
      <span className="bc-row-main">
        <b style={{ fontSize: own ? "14px" : "13px", display: "block" }}>{p.name}</b>
        <span className="p-muted" style={{ fontSize: own ? "12px" : "11px" }}>
          {p.unit} · {p.cur === "USD" ? formatUsd(p.price) : formatKhr(p.price)}
          {!own && p.supplier_name && ` · ${p.supplier_name}`}
        </span>
      </span>
      <span className={`bc-cur bc-cur-${p.cur}`}>{p.cur}</span>
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "14px" }}>
      <label className="w-search" style={{ width: "100%", padding: "4px 10px" }}>
        <BonchiIcon name="search" size={16} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ស្វែងរកទំនិញ..."
          style={{ fontSize: "13px" }}
          autoFocus
        />
      </label>

      {supplierId && (
        <>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--brand-dark)", textTransform: "uppercase", marginTop: "4px" }}>
            ⭐ ទំនិញរបស់ហាង {supplierName}
          </div>
          {shopProds.map((p) => row(p, true))}
          {!shopLoading && shopProds.length === 0 && (
            <div className="p-muted" style={{ fontSize: "12px", padding: "6px 2px" }}>
              {debouncedSearch ? `រកមិនឃើញ “${debouncedSearch}” ក្នុងហាងនេះ` : "ហាងនេះមិនទាន់មានទំនិញទេ"}
            </div>
          )}
          {shopLoading && (
            <div className="p-muted" style={{ fontSize: "12px", padding: "6px 2px" }}>កំពុងទាញទិន្នន័យ...</div>
          )}
          {shopData && (
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
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginTop: "8px" }}>
            ពីហាងផ្សេងទៀត
          </div>
          {otherProds.map((p) => row(p, false))}
        </>
      )}
      {!supplierId && !debouncedSearch && (
        <div className="p-muted" style={{ fontSize: "12px", padding: "6px 2px" }}>
          វាយឈ្មោះទំនិញ ដើម្បីស្វែងរកពីហាងទាំងអស់
        </div>
      )}
    </div>
  );
}
