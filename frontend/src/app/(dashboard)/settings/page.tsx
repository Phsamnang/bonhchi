"use client";

import React, { useState } from "react";
import BonchiIcon from "@/components/BonchiIcon";
import TableListModal from "@/components/TableListModal";
import { formatUsd, formatKhr } from "@/lib/utils";
import { useDashboardContext } from "../DashboardContext";
import { useTables } from "@/hooks/useTables";
import { useProductPage } from "@/hooks/useMasterData";
import { usePagedSearch } from "@/hooks/usePagedSearch";
import Pager from "@/components/Pager";

const CATALOG_PAGE_SIZE = 10;

export default function SettingsPage() {
  const ctx = useDashboardContext();
  const masterShops = ctx.masterShops || [];
  const catalog = usePagedSearch();
  const {
    data: catalogData,
    isLoading: catalogLoading,
    isFetching: catalogFetching,
  } = useProductPage(null, { page: catalog.page, limit: CATALOG_PAGE_SIZE, search: catalog.debouncedSearch });
  const catalogProducts = catalogData?.products ?? [];
  const { data: tables = [] } = useTables();
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);

  return (
    <>
      {/* Account: who is signed in + log out (main logout entry on mobile) */}
      <section className="w-panel" style={{ marginBottom: "16px" }}>
        <div className="p-row" style={{ gap: "12px" }}>
          <div className="w-avatar">{ctx.session?.user?.name ? ctx.session.user.name.charAt(0) : "B"}</div>
          <span className="p-grow">
            <b style={{ display: "block" }}>{ctx.session?.user?.name || "អ្នកប្រើប្រាស់"}</b>
            <span className="p-muted" style={{ fontSize: "13px" }}>
              {ctx.roleLabel} · @{ctx.session?.user?.username || "—"}
            </span>
          </span>
          <button
            type="button"
            className="bc-btn bc-btn-secondary"
            style={{ minHeight: "40px", color: "var(--expense)" }}
            onClick={() => {
              if (confirm("តើអ្នកចង់ចាកចេញពីប្រព័ន្ធមែនទេ? (Log out?)")) ctx.logout();
            }}
          >
            ចាកចេញ (Log out)
          </button>
        </div>
      </section>

    <div className="w-two">
      <section className="w-panel">
        <h2>
          អ្នកផ្គត់ផ្គង់ & ហាង <small>Suppliers ({masterShops.length})</small>
        </h2>
        {masterShops.map((sh) => (
          <div
            key={sh.id}
            className="p-row"
            style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}
          >
            <span className="bc-disc bc-disc-expense">
              <BonchiIcon name="cart" size={20} />
            </span>
            <span className="p-grow">
              <b style={{ display: "block" }}>{sh.name}</b>
              <span className="p-muted">{sh.market_location || "ហាងផ្សារ"}</span>
            </span>
          </div>
        ))}
      </section>

      <section className="w-panel">
        <h2>
          ទំនិញក្នុងប្រព័ន្ធ <small>Products Catalog ({catalogData?.total ?? 0})</small>
        </h2>
        <label className="w-search" style={{ width: "100%", padding: "4px 10px" }}>
          <BonchiIcon name="search" size={16} />
          <input
            value={catalog.search}
            onChange={(e) => catalog.setSearch(e.target.value)}
            placeholder="ស្វែងរកទំនិញ..."
            style={{ fontSize: "13px" }}
          />
        </label>
        {catalogProducts.map((pr) => (
          <div
            key={pr.id}
            className="p-row"
            style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}
          >
            <span className="bc-disc bc-disc-brand">
              <BonchiIcon name="leaf" size={20} />
            </span>
            <span className="p-grow">
              <b style={{ display: "block" }}>{pr.name}</b>
              <span className="p-muted">
                1 {pr.unit}
                {pr.supplier_name && ` · ${pr.supplier_name}`}
              </span>
            </span>
            <span className="font-bold">
              {pr.cur === "USD" ? formatUsd(pr.price) : formatKhr(pr.price)}
            </span>
          </div>
        ))}
        {!catalogLoading && catalogProducts.length === 0 && (
          <p className="p-muted" style={{ margin: 0, padding: "12px 0", textAlign: "center" }}>
            {catalog.debouncedSearch ? `រកមិនឃើញ “${catalog.debouncedSearch}”` : "មិនទាន់មានទំនិញទេ"}
          </p>
        )}
        {catalogData && (
          <Pager
            page={catalog.page}
            totalPages={catalogData.totalPages}
            total={catalogData.total}
            shown={catalogProducts.length}
            pageSize={CATALOG_PAGE_SIZE}
            onPage={catalog.setPage}
            loading={catalogFetching}
          />
        )}
      </section>

      {/* Restaurant Tables Management */}
      <section className="w-panel" style={{ gridColumn: "1 / -1" }}>
        <div className="p-row" style={{ justifyContent: "space-between", marginBottom: "12px" }}>
          <h2>
            តុក្នុងភោជនីយដ្ឋាន <small>Restaurant Tables ({tables.length})</small>
          </h2>
          <button
            type="button"
            onClick={() => setIsTableModalOpen(true)}
            className="bc-btn bc-btn-secondary"
            style={{ padding: "6px 12px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <BonchiIcon name="plus" size={16} />
            <span>គ្រប់គ្រង & បន្ថែមតុ</span>
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px" }}>
          {tables.map((tbl) => (
            <div
              key={tbl.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid var(--line)",
                background: "var(--surface)",
              }}
            >
              <span
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "rgba(16, 185, 129, 0.12)",
                  color: "var(--income, #10b981)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <BonchiIcon name="table" size={16} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ fontSize: "13px", display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                  {tbl.name}
                </b>
                <span className="p-muted" style={{ fontSize: "11px" }}>
                  {tbl.code ? `កូដ: ${tbl.code} · ` : ""}{tbl.status === "available" ? "ទំនេរ" : tbl.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>

    {/* Table Management Modal */}
    <TableListModal
      isOpen={isTableModalOpen}
      onClose={() => setIsTableModalOpen(false)}
    />
    </>
  );
}
