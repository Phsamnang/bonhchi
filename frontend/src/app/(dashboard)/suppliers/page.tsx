"use client";

import React, { useState } from "react";
import BonchiIcon from "@/components/BonchiIcon";
import { formatUsd, formatKhr, formatDate } from "@/lib/utils";
import {
  useShops,
  useProducts,
  useCreateSupplierMutation,
  useCreateProductMutation,
  useDeleteProductMutation,
  Shop,
} from "@/hooks/useMasterData";
import { useInvoices } from "@/hooks/useInvoices";
import { useDashboardContext } from "../DashboardContext";

export default function SuppliersPage() {
  const { showToast, openMarketTrip, setSelectedInvoice } = useDashboardContext();
  const { data: shops = [], isLoading: isLoadingShops } = useShops();

  // Selected supplier state
  const [selectedShopId, setSelectedShopId] = useState<string | number | null>(null);
  const [searchShop, setSearchShop] = useState("");
  const [searchProduct, setSearchProduct] = useState("");

  // Modal states
  const [isAddShopOpen, setIsAddShopOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);

  // New Shop form fields
  const [newShopName, setNewShopName] = useState("");
  const [newShopLocation, setNewShopLocation] = useState("ផ្សារថ្មី");
  const [newShopPhone, setNewShopPhone] = useState("");
  const [newShopNote, setNewShopNote] = useState("");

  // New Product form fields
  const [newProdName, setNewProdName] = useState("");
  const [newProdUnit, setNewProdUnit] = useState("គីឡូ");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdCur, setNewProdCur] = useState<"USD" | "KHR">("USD");

  // Mutations
  const createSupplierMutation = useCreateSupplierMutation();
  const createProductMutation = useCreateProductMutation();
  const deleteProductMutation = useDeleteProductMutation();

  // Auto-select first shop if not set
  const activeShopId = selectedShopId || (shops.length > 0 ? shops[0].id : null);
  const selectedShop = shops.find((s) => String(s.id) === String(activeShopId));

  // Query products specifically for this supplier
  const { data: supplierProducts = [], isLoading: isLoadingProducts } = useProducts(activeShopId);

  // This supplier's invoices (API matches by name; keep exact matches only)
  const { data: supplierInvoicesData } = useInvoices(
    selectedShop ? { type: "expense", supplier: selectedShop.name } : undefined
  );
  const supplierInvoices = (supplierInvoicesData?.invoices ?? []).filter(
    (inv) => selectedShop && inv.supplier_name === selectedShop.name
  );

  // Filtered shops
  const filteredShops = shops.filter(
    (s) =>
      s.name.toLowerCase().includes(searchShop.toLowerCase()) ||
      (s.market_location && s.market_location.toLowerCase().includes(searchShop.toLowerCase()))
  );

  // Filtered products for active shop
  const filteredProducts = supplierProducts.filter((p) =>
    p.name.toLowerCase().includes(searchProduct.toLowerCase())
  );

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isAddProductOpen) setIsAddProductOpen(false);
        else if (isAddShopOpen) setIsAddShopOpen(false);
      }
    };
    if (isAddShopOpen || isAddProductOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isAddShopOpen, isAddProductOpen]);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim()) {
      showToast("សូមបញ្ចូលឈ្មោះហាង / អ្នកផ្គត់ផ្គង់");
      return;
    }
    try {
      const created = await createSupplierMutation.mutateAsync({
        name: newShopName.trim(),
        market_location: newShopLocation.trim() || undefined,
        contact_phone: newShopPhone.trim() || undefined,
        note: newShopNote.trim() || undefined,
      });
      showToast("បានបង្កើតអ្នកផ្គត់ផ្គង់ថ្មីដោយជោគជ័យ!");
      setIsAddShopOpen(false);
      setNewShopName("");
      setNewShopPhone("");
      setNewShopNote("");
      setSelectedShopId(created.id);
    } catch (err: any) {
      showToast(err.message || "មិនអាចបង្កើតអ្នកផ្គត់ផ្គង់បានទេ");
    }
  };

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

  return (
    <>
      {/* Search & Actions Bar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "220px" }}>
          <label className="w-search" style={{ width: "100%", maxWidth: "360px" }}>
            <BonchiIcon name="search" size={18} />
            <input
              value={searchShop}
              onChange={(e) => setSearchShop(e.target.value)}
              placeholder="ស្វែងរកហាង ឬ ទីតាំងផ្សារ..."
            />
          </label>
        </div>

        <button
          type="button"
          className="bc-btn bc-btn-primary"
          onClick={() => setIsAddShopOpen(true)}
          style={{ minHeight: "42px" }}
        >
          <BonchiIcon name="plus" size={18} />
          បន្ថែមហាងផ្គត់ផ្គង់ថ្មី
        </button>
      </div>

      {/* Two Column Layout: Suppliers List on Left, Supplier's Products on Right */}
      <div className="w-two">
        {/* Left Column: Suppliers List */}
        <section className="w-panel" style={{ gap: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <h2 style={{ margin: 0 }}>
              បញ្ជីហាងផ្គត់ផ្គង់ <small>({filteredShops.length})</small>
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {filteredShops.length > 0 ? (
              filteredShops.map((sh) => {
                const isSelected = String(sh.id) === String(activeShopId);
                return (
                  <div
                    key={sh.id}
                    onClick={() => setSelectedShopId(sh.id)}
                    className="p-row cursor-pointer transition"
                    style={{
                      padding: "12px",
                      borderRadius: "14px",
                      border: isSelected
                        ? "2px solid var(--brand)"
                        : "1px solid var(--line)",
                      background: isSelected
                        ? "var(--brand-soft)"
                        : "var(--surface)",
                      boxShadow: isSelected ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
                    }}
                  >
                    <span
                      className={`bc-disc ${isSelected ? "bc-disc-brand" : "bc-disc-expense"}`}
                      style={{ width: "42px", height: "42px", flexShrink: 0 }}
                    >
                      <BonchiIcon name="cart" size={20} />
                    </span>

                    <span className="p-grow" style={{ minWidth: 0 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <b style={{ fontSize: "15px", color: isSelected ? "var(--brand-dark)" : "var(--ink)" }}>
                          {sh.name}
                        </b>
                      </span>

                      <span className="p-muted" style={{ display: "flex", flexWrap: "wrap", gap: "8px", fontSize: "12px", marginTop: "2px" }}>
                        <span>📍 {sh.market_location || "ផ្សារថ្មី"}</span>
                        {sh.contact_phone && <span>📞 {sh.contact_phone}</span>}
                      </span>
                    </span>

                    <span
                      className="bc-badge"
                      style={{
                        background: isSelected ? "var(--brand)" : "var(--surface-raised)",
                        color: isSelected ? "#fff" : "var(--ink)",
                        fontWeight: 600,
                        fontSize: "12px",
                        padding: "3px 8px",
                      }}
                    >
                      {sh.product_count ?? 0} មុខ
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="p-muted" style={{ padding: "32px 0", textAlign: "center" }}>
                រកមិនឃើញហាងផ្គត់ផ្គង់ទេ
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Selected Supplier's Products Catalog */}
        <section className="w-panel" style={{ gap: "16px" }}>
          {selectedShop ? (
            <>
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
                  មុខទំនិញផ្គត់ផ្គង់ដោយហាងនេះ <small>({filteredProducts.length} មុខ)</small>
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
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((p, idx) => (
                        <tr key={p.id}>
                          <td className="p-muted">{idx + 1}</td>
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
                    ) : (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", padding: "32px 16px" }} className="p-muted">
                          {isLoadingProducts ? (
                            "កំពុងទាញទិន្នន័យទំនិញ..."
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

              {/* This supplier's invoices */}
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
                វិក្កយបត្រពីហាងនេះ <small>({supplierInvoices.length})</small>
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
                    {supplierInvoices.length > 0 ? (
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
            </>
          ) : (
            <div className="p-muted" style={{ padding: "40px", textAlign: "center" }}>
              សូមជ្រើសរើសហាងផ្គត់ផ្គង់មួយពីខាងឆ្វេង
            </div>
          )}
        </section>
      </div>

      {/* ─── Modal 1: Add New Supplier ─── */}
      {isAddShopOpen && (
        <>
          <div className="p-scrim" onClick={() => setIsAddShopOpen(false)} aria-label="បិទ Close" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="បន្ថែមហាងផ្គត់ផ្គង់"
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
                    background: "var(--expense-soft)",
                    color: "var(--expense)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <BonchiIcon name="cart" size={22} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "17px", color: "var(--ink)" }}>
                    បន្ថែមហាងផ្គត់ផ្គង់
                  </div>
                  <div className="p-muted" style={{ fontSize: "12px", marginTop: "1px" }}>
                    ចុះឈ្មោះហាង ឬ អ្នកផ្គត់ផ្គង់ថ្មីក្នុងប្រព័ន្ធ
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="bc-iconbtn"
                onClick={() => setIsAddShopOpen(false)}
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
              onSubmit={handleCreateSupplier}
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
                    ឈ្មោះហាង / អ្នកផ្គត់ផ្គង់ <strong style={{ color: "var(--danger)" }}>*</strong>
                  </span>
                  <span className="bc-input">
                    <BonchiIcon name="cart" size={18} />
                    <input
                      placeholder="ឧ. ហាងសាច់ ផ្សារថ្មី, ហាងបន្លែ បងលាង..."
                      value={newShopName}
                      onChange={(e) => setNewShopName(e.target.value)}
                      style={{ border: "none", outline: "none", boxShadow: "none", background: "transparent" }}
                      required
                      autoFocus
                    />
                  </span>
                </label>

                <label className="bc-field" style={{ margin: 0 }}>
                  <span className="bc-field-label">ទីតាំងផ្សារ / អាសយដ្ឋាន</span>
                  <span className="bc-input">
                    <input
                      placeholder="ឧ. ផ្សារថ្មី, ផ្សារដើមគរ, ផ្សារច្បារអំពៅ..."
                      value={newShopLocation}
                      onChange={(e) => setNewShopLocation(e.target.value)}
                      style={{ border: "none", outline: "none", boxShadow: "none", background: "transparent" }}
                    />
                  </span>
                </label>

                {/* Quick location chips */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginTop: "-6px" }}>
                  <span className="p-muted" style={{ fontSize: "12px" }}>ទីតាំងរហ័ស៖</span>
                  {["ផ្សារថ្មី", "ផ្សារដើមគរ", "ផ្សារច្បារអំពៅ", "ផ្សារអូឡាំពិក", "ផ្សារបឹងកេងកង"].map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setNewShopLocation(loc)}
                      className={`p-chip ${newShopLocation === loc ? "p-chip-on" : ""}`}
                      style={{ minHeight: "28px", padding: "0 10px", fontSize: "12px" }}
                    >
                      {loc}
                    </button>
                  ))}
                </div>

                <label className="bc-field" style={{ margin: 0 }}>
                  <span className="bc-field-label">លេខទូរស័ព្ទទំនាក់ទំនង (Contact phone)</span>
                  <span className="bc-input">
                    <input
                      type="tel"
                      placeholder="ឧ. 012 345 678"
                      value={newShopPhone}
                      onChange={(e) => setNewShopPhone(e.target.value)}
                      style={{ border: "none", outline: "none", boxShadow: "none", background: "transparent" }}
                    />
                  </span>
                </label>

                <label className="bc-field" style={{ margin: 0 }}>
                  <span className="bc-field-label">ចំណាំបន្ថែម (Note)</span>
                  <span className="bc-input">
                    <input
                      placeholder="ឧ. បញ្ចុះតម្លៃពេលទិញលើស 20kg"
                      value={newShopNote}
                      onChange={(e) => setNewShopNote(e.target.value)}
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
                  onClick={() => setIsAddShopOpen(false)}
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="bc-btn bc-btn-primary"
                  style={{ flex: 1, minHeight: "44px" }}
                  disabled={createSupplierMutation.isPending}
                >
                  {createSupplierMutation.isPending ? "កំពុងរក្សាទុក..." : "រក្សាទុកហាង"}
                </button>
              </footer>
            </form>
          </div>
        </>
      )}

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
