"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import BonchiIcon from "@/components/BonchiIcon";
import { formatUsd, formatKhr, formatDate } from "@/lib/utils";
import {
  useShops,
  useProductPage,
  useCreateProductMutation,
  useDeleteProductMutation,
} from "@/hooks/useMasterData";
import { useInvoices } from "@/hooks/useInvoices";
import { useDashboardContext } from "../../DashboardContext";
import { usePagedSearch } from "@/hooks/usePagedSearch";
import Pager from "@/components/Pager";
import { Skeleton, TableRowsSkeleton } from "@/components/ui/skeleton";

const PRODUCTS_PER_PAGE = 20;
const INVOICES_PER_PAGE = 20;

/** One supplier: its details, all of its products (paginated), and its invoices. */
export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast, openMarketTrip, setSelectedInvoice } = useDashboardContext();
  const { data: shops = [], isLoading: isLoadingShops } = useShops();

  const activeShopId = id;
  const selectedShop = shops.find((s) => String(s.id) === String(id));

  const [isAddProductOpen, setIsAddProductOpen] = useState(false);

  // New Product form fields
  const [newProdName, setNewProdName] = useState("");
  const [newProdUnit, setNewProdUnit] = useState("គីឡូ");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdCur, setNewProdCur] = useState<"USD" | "KHR">("USD");

  const createProductMutation = useCreateProductMutation();
  const deleteProductMutation = useDeleteProductMutation();

  // This supplier's products, one page at a time; the search runs on the server
  const {
    search: searchProduct,
    setSearch: setSearchProduct,
    debouncedSearch: debouncedProductSearch,
    page: productPage,
    setPage: setProductPage,
  } = usePagedSearch([activeShopId]);
  const {
    data: productPageData,
    isLoading: isLoadingProducts,
    isFetching: isFetchingProducts,
  } = useProductPage(activeShopId, { page: productPage, limit: PRODUCTS_PER_PAGE, search: debouncedProductSearch });
  const pageProducts = productPageData?.products ?? [];
  const productTotal = productPageData?.total ?? 0;
  const productTotalPages = productPageData?.totalPages ?? 1;
  const firstRowNo = (productPage - 1) * PRODUCTS_PER_PAGE + 1;

  // This supplier's invoices, one page at a time (matched on the server by id, or by exact name)
  const { page: invoicePage, setPage: setInvoicePage } = usePagedSearch([activeShopId]);
  const {
    data: supplierInvoicesData,
    isLoading: isLoadingSupplierInvoices,
    isFetching: isFetchingSupplierInvoices,
  } = useInvoices(
    {
      type: "expense",
      supplier_id: activeShopId,
      supplier: selectedShop?.name,
      page: invoicePage,
      limit: INVOICES_PER_PAGE,
    },
    { enabled: !!selectedShop }
  );
  const supplierInvoices = supplierInvoicesData?.invoices ?? [];
  const invoiceTotal = supplierInvoicesData?.total ?? 0;
  const invoiceTotalPages = supplierInvoicesData?.totalPages ?? 1;

  React.useEffect(() => {
    if (!isAddProductOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsAddProductOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAddProductOpen]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdUnit.trim()) {
      showToast("សូមបញ្ចូលឈ្មោះទំនិញ និងខ្នាត");
      return;
    }
    if (!activeShopId) {
      showToast("សូមជ្រើសរើសហាងជាមុនសិន");
      return;
    }
    try {
      await createProductMutation.mutateAsync({
        name: newProdName.trim(),
        unit: newProdUnit.trim(),
        price: parseFloat(newProdPrice) || 0,
        cur: newProdCur,
        supplier_id: activeShopId,
      });
      showToast(`បានបញ្ចូល "${newProdName}" ទៅក្នុងហាង ${selectedShop?.name || ""}!`);
      setIsAddProductOpen(false);
      setNewProdName("");
      setNewProdPrice("");
    } catch (err: any) {
      showToast(err.message || "មិនអាចបង្កើតទំនិញបានទេ");
    }
  };

  const handleDeleteProduct = async (prodId: string | number, prodName: string) => {
    if (!confirm(`តើអ្នកពិតជាចង់លុបទំនិញ "${prodName}" មែនទេ?`)) return;
    try {
      await deleteProductMutation.mutateAsync(prodId);
      showToast(`បានលុបទំនិញ "${prodName}"`);
    } catch (err: any) {
      showToast(err.message || "មិនអាចលុបទំនិញបានទេ");
    }
  };

  if (!selectedShop) {
    if (isLoadingShops) {
      return (
        <section className="w-panel" style={{ gap: "16px" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <Skeleton className="h-10 w-10" circle />
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3.5 w-32" />
            </div>
          </div>
          <div className="w-tablewrap">
            <table className="w-table">
              <tbody>
                <TableRowsSkeleton cols={6} rows={6} />
              </tbody>
            </table>
          </div>
        </section>
      );
    }
    return (
      <section className="w-panel" style={{ alignItems: "center", padding: "40px 16px", gap: "12px" }}>
        <p className="p-muted" style={{ margin: 0 }}>
          រកមិនឃើញហាងផ្គត់ផ្គង់នេះទេ
        </p>
        <Link href="/suppliers" className="bc-btn bc-btn-secondary">
          ‹ ត្រឡប់ទៅបញ្ជីហាង
        </Link>
      </section>
    );
  }

  return (
    <>
      <div style={{ marginBottom: "12px" }}>
        <Link
          href="/suppliers"
          className="bc-btn bc-btn-secondary"
          style={{ minHeight: "36px", height: "36px", fontSize: "13px", display: "inline-flex" }}
        >
          ‹ បញ្ជីហាងផ្គត់ផ្គង់
        </Link>
      </div>

      <section className="w-panel" style={{ gap: "16px" }}>
        {/* Supplier Header Box */}
        <div
          style={{
            background: "var(--surface-sunken)",
            padding: "14px 16px",
            borderRadius: "14px",
            border: "1px solid var(--line)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="bc-disc bc-disc-brand" style={{ width: 34, height: 34 }}>
                <BonchiIcon name="cart" size={18} />
              </span>
              <h2 style={{ margin: 0, fontSize: "18px" }}>{selectedShop.name}</h2>
            </div>
            <div className="p-muted" style={{ fontSize: "13px", marginTop: "4px" }}>
              ទីតាំង: <b>{selectedShop.market_location || "ផ្សារ"}</b>
              {selectedShop.contact_phone && ` · លេខទូរស័ព្ទ: ${selectedShop.contact_phone}`}
              {selectedShop.note && ` · ចំណាំ: ${selectedShop.note}`}
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              className="bc-btn bc-btn-secondary"
              onClick={() => setIsAddProductOpen(true)}
              style={{ minHeight: "38px", fontSize: "13px" }}
            >
              <BonchiIcon name="plus" size={16} />
              បន្ថែមមុខទំនិញ
            </button>
            <button
              type="button"
              className="bc-btn bc-btn-primary"
              onClick={() => openMarketTrip(selectedShop)}
              style={{ minHeight: "38px", fontSize: "13px" }}
              title="បង្កើតវិក្កយបត្រទិញទំនិញពីហាងនេះ"
            >
              <BonchiIcon name="cart" size={16} />
              🧾 បង្កើតវិក្កយបត្រ
            </button>
          </div>
        </div>

        {/* Products Search & List */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
            មុខទំនិញផ្គត់ផ្គង់ដោយហាងនេះ <small>({productTotal} មុខ)</small>
          </h3>
          <label className="w-search" style={{ maxWidth: "200px", padding: "4px 8px" }}>
            <BonchiIcon name="search" size={16} />
            <input
              value={searchProduct}
              onChange={(e) => setSearchProduct(e.target.value)}
              placeholder="ស្វែងរកទំនិញ..."
              style={{ fontSize: "13px" }}
            />
          </label>
        </div>

        {/* Products Table */}
        <div className="w-tablewrap">
          <table className="w-table">
            <thead>
              <tr>
                <th style={{ width: "40px" }}>#</th>
                <th>ឈ្មោះមុខទំនិញ (Product)</th>
                <th>ខ្នាត (Unit)</th>
                <th className="num">តម្លៃគោល (Price)</th>
                <th>រូបិយប័ណ្ណ</th>
                <th style={{ textAlign: "center", width: "70px" }}>សកម្មភាព</th>
              </tr>
            </thead>
            <tbody>
              {pageProducts.length > 0 ? (
                pageProducts.map((p, idx) => (
                  <tr key={p.id}>
                    <td className="p-muted">{firstRowNo + idx}</td>
                    <td>
                      <b style={{ fontSize: "14px" }}>{p.name}</b>
                    </td>
                    <td>
                      <span className="bc-badge" style={{ background: "var(--surface-raised)" }}>
                        {p.unit}
                      </span>
                    </td>
                    <td className="num font-bold">
                      {p.cur === "USD" ? formatUsd(p.price) : formatKhr(p.price)}
                    </td>
                    <td>
                      <span className={`bc-cur bc-cur-${p.cur}`}>{p.cur}</span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(p.id, p.name)}
                        className="bc-iconbtn"
                        title="លុបទំនិញ"
                        style={{ width: "30px", height: "30px", color: "var(--expense)" }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))
              ) : isLoadingProducts && !productPageData ? (
                <TableRowsSkeleton cols={6} rows={6} />
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "32px 16px" }} className="p-muted">
                    {debouncedProductSearch ? (
                      <p style={{ margin: 0 }}>រកមិនឃើញទំនិញ “{debouncedProductSearch}” ក្នុងហាងនេះទេ</p>
                    ) : (
                      <div>
                        <p style={{ margin: "0 0 10px 0" }}>ហាងនេះមិនទាន់មានមុខទំនិញដែលបានចុះបញ្ជីនៅឡើយទេ</p>
                        <button
                          type="button"
                          className="bc-btn bc-btn-secondary"
                          onClick={() => setIsAddProductOpen(true)}
                        >
                          <BonchiIcon name="plus" size={16} />
                          បន្ថែមទំនិញដំបូងសម្រាប់ហាងនេះ
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Products pagination */}
        {productPageData && (
          <Pager
            page={productPage}
            totalPages={productTotalPages}
            total={productTotal}
            shown={pageProducts.length}
            pageSize={PRODUCTS_PER_PAGE}
            onPage={setProductPage}
            loading={isFetchingProducts}
          />
        )}

        {/* This supplier's invoices */}
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
          វិក្កយបត្រពីហាងនេះ <small>({invoiceTotal})</small>
        </h3>
        <div className="w-tablewrap">
          <table className="w-table">
            <thead>
              <tr>
                <th>កាលបរិច្ឆេទ</th>
                <th>លេខ</th>
                <th>បង់តាម</th>
                <th>ស្ថានភាព</th>
                <th className="num">សរុប $</th>
                <th className="num">សរុប ៛</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingSupplierInvoices && !supplierInvoicesData ? (
                <TableRowsSkeleton cols={6} rows={4} />
              ) : supplierInvoices.length > 0 ? (
                supplierInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => setSelectedInvoice(inv)}
                    style={{ cursor: "pointer", opacity: inv.status === "void" ? 0.5 : 1 }}
                  >
                    <td className="p-muted">{formatDate(inv.date)}</td>
                    <td style={{ fontWeight: 600 }}>{inv.invoice_no}</td>
                    <td>{(inv.wallet_code || "").toUpperCase()}</td>
                    <td>
                      {inv.status === "paid"
                        ? "✓ បង់រួច"
                        : inv.status === "partial"
                        ? "◐ បង់ខ្លះ"
                        : inv.status === "void"
                        ? "✕ បានលុប"
                        : "⏳ ជំពាក់"}
                    </td>
                    <td className="num">{inv.total_usd > 0 ? formatUsd(inv.total_usd) : "—"}</td>
                    <td className="num">{inv.total_khr > 0 ? formatKhr(inv.total_khr) : "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-muted" style={{ textAlign: "center", padding: "20px" }}>
                    មិនទាន់មានវិក្កយបត្រពីហាងនេះទេ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {supplierInvoicesData && (
          <Pager
            page={invoicePage}
            totalPages={invoiceTotalPages}
            total={invoiceTotal}
            shown={supplierInvoices.length}
            pageSize={INVOICES_PER_PAGE}
            onPage={setInvoicePage}
            loading={isFetchingSupplierInvoices}
            unit="វិក្កយបត្រ"
          />
        )}
      </section>

      {/* ─── Modal 2: Add Product to Supplier ─── */}
      {isAddProductOpen && selectedShop && (
        <>
          <div className="p-scrim" onClick={() => setIsAddProductOpen(false)} aria-label="បិទ Close" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="បន្ថែមមុខទំនិញថ្មី"
            style={{
              position: "fixed",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: "min(560px, 94vw)",
              maxHeight: "90vh",
              background: "var(--surface-raised)",
              borderRadius: "20px",
              boxShadow: "0 24px 64px rgba(0, 0, 0, 0.28)",
              border: "1px solid var(--line)",
              zIndex: 1000,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <header
              style={{
                padding: "16px 22px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid var(--line)",
                background: "var(--surface)",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "12px",
                    background: "var(--brand-soft)",
                    color: "var(--brand)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <BonchiIcon name="leaf" size={22} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "17px", color: "var(--ink)" }}>
                    បន្ថែមមុខទំនិញថ្មី
                  </div>
                  <div className="p-muted" style={{ fontSize: "12px", marginTop: "1px" }}>
                    ផ្គត់ផ្គង់ដោយ៖ <b style={{ color: "var(--ink)" }}>{selectedShop.name}</b>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="bc-iconbtn"
                onClick={() => setIsAddProductOpen(false)}
                aria-label="បិទ Close"
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "var(--surface-sunken)",
                  border: "1px solid var(--line)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--ink-muted)",
                }}
              >
                <BonchiIcon name="x" size={18} />
              </button>
            </header>

            <form
              onSubmit={handleCreateProduct}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                overflowY: "auto",
              }}
            >
              <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <label className="bc-field" style={{ margin: 0 }}>
                  <span className="bc-field-label">
                    ឈ្មោះទំនិញ (Product name) <strong style={{ color: "var(--danger)" }}>*</strong>
                  </span>
                  <span className="bc-input">
                    <BonchiIcon name="cart" size={18} />
                    <input
                      placeholder="ឧ. សាច់គោបន្ទះ, ស្ពៃបូកគោ, ខ្ទឹមស..."
                      value={newProdName}
                      onChange={(e) => setNewProdName(e.target.value)}
                      style={{ border: "none", outline: "none", boxShadow: "none", background: "transparent" }}
                      required
                      autoFocus
                    />
                  </span>
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <label className="bc-field" style={{ margin: 0 }}>
                    <span className="bc-field-label">
                      ខ្នាត (Unit) <strong style={{ color: "var(--danger)" }}>*</strong>
                    </span>
                    <span className="bc-input">
                      <input
                        placeholder="ឧ. គីឡូ, ដប, កេស, បាវ"
                        value={newProdUnit}
                        onChange={(e) => setNewProdUnit(e.target.value)}
                        style={{ border: "none", outline: "none", boxShadow: "none", background: "transparent" }}
                        required
                      />
                    </span>
                  </label>

                  <div className="bc-field" style={{ margin: 0 }}>
                    <span className="bc-field-label">រូបិយប័ណ្ណ (Currency)</span>
                    <div className="bc-seg bc-seg-full" style={{ minHeight: "42px" }}>
                      <button
                        type="button"
                        aria-pressed={newProdCur === "USD"}
                        onClick={() => setNewProdCur("USD")}
                      >
                        USD ($)
                      </button>
                      <button
                        type="button"
                        aria-pressed={newProdCur === "KHR"}
                        onClick={() => setNewProdCur("KHR")}
                      >
                        KHR (៛)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick unit chips */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginTop: "-6px" }}>
                  <span className="p-muted" style={{ fontSize: "12px" }}>ខ្នាតរហ័ស៖</span>
                  {["គីឡូ", "ដប", "កេស", "កញ្ចប់", "បាវ", "ផ្លែ"].map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setNewProdUnit(u)}
                      className={`p-chip ${newProdUnit === u ? "p-chip-on" : ""}`}
                      style={{ minHeight: "28px", padding: "0 10px", fontSize: "12px" }}
                    >
                      {u}
                    </button>
                  ))}
                </div>

                <label className="bc-field" style={{ margin: 0 }}>
                  <span className="bc-field-label">តម្លៃគោល (Default Price {newProdCur})</span>
                  <span className="bc-input">
                    <span style={{ fontWeight: 600, color: "var(--ink-muted)", fontSize: "15px" }}>
                      {newProdCur === "USD" ? "$" : "៛"}
                    </span>
                    <input
                      type="number"
                      step="any"
                      placeholder={newProdCur === "USD" ? "4.50" : "18000"}
                      value={newProdPrice}
                      onChange={(e) => setNewProdPrice(e.target.value)}
                      style={{ border: "none", outline: "none", boxShadow: "none", background: "transparent" }}
                    />
                  </span>
                </label>
              </div>

              <footer
                style={{
                  padding: "16px 22px",
                  borderTop: "1px solid var(--line)",
                  background: "var(--surface)",
                  display: "flex",
                  gap: "10px",
                  marginTop: "auto",
                }}
              >
                <button
                  type="button"
                  className="bc-btn bc-btn-secondary"
                  style={{ flex: 1, minHeight: "44px" }}
                  onClick={() => setIsAddProductOpen(false)}
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="bc-btn bc-btn-primary"
                  style={{ flex: 1, minHeight: "44px" }}
                  disabled={createProductMutation.isPending}
                >
                  {createProductMutation.isPending ? "កំពុងបញ្ចូល..." : "បញ្ចូលទំនិញ"}
                </button>
              </footer>
            </form>
          </div>
        </>
      )}
    </>
  );
}
