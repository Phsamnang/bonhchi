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
  const { data: shops = [], isLoading: isLoadingShops, refetch: refetchShops } = useShops();

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
      refetchShops();
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
      refetchShops();
    } catch (err: any) {
      showToast(err.message || "មិនអាចបង្កើតទំនិញបានទេ");
    }
  };

  const handleDeleteProduct = async (prodId: string | number, prodName: string) => {
    if (!confirm(`តើអ្នកពិតជាចង់លុបទំនិញ "${prodName}" មែនទេ?`)) return;
    try {
      await deleteProductMutation.mutateAsync(prodId);
      showToast(`បានលុបទំនិញ "${prodName}"`);
      refetchShops();
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
          + បន្ថែមហាងផ្គត់ផ្គង់ថ្មី
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
                    + បន្ថែមមុខទំនិញ
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
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span className="bc-disc bc-disc-brand" style={{ width: 28, height: 28 }}>
                                <BonchiIcon name="leaf" size={16} />
                              </span>
                              <b style={{ fontSize: "14px" }}>{p.name}</b>
                            </div>
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
        <div className="p-scrim" onClick={() => setIsAddShopOpen(false)}>
          <div
            className="p-sheet"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "480px", margin: "auto" }}
          >
            <div className="p-grab" />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "20px" }}>+ បន្ថែមហាងផ្គត់ផ្គង់</h2>
                <div className="p-muted" style={{ fontSize: "13px" }}>ចុះឈ្មោះហាង ឬ អ្នកផ្គត់ផ្គង់ថ្មី</div>
              </div>
              <button
                type="button"
                className="bc-iconbtn"
                onClick={() => setIsAddShopOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-4">
              <div>
                <label className="p-lbl" style={{ display: "block", marginBottom: "6px" }}>
                  ឈ្មោះហាង / អ្នកផ្គត់ផ្គង់ *
                </label>
                <input
                  className="bc-input"
                  style={{ width: "100%" }}
                  placeholder="ឧ. ហាងសាច់ ផ្សារថ្មី, ហាងបន្លែ បងលាង..."
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="p-lbl" style={{ display: "block", marginBottom: "6px" }}>
                  ទីតាំងផ្សារ / អាសយដ្ឋាន
                </label>
                <input
                  className="bc-input"
                  style={{ width: "100%" }}
                  placeholder="ឧ. ផ្សារថ្មី, ផ្សារដើមគរ, ផ្សារច្បារអំពៅ..."
                  value={newShopLocation}
                  onChange={(e) => setNewShopLocation(e.target.value)}
                />
              </div>

              <div>
                <label className="p-lbl" style={{ display: "block", marginBottom: "6px" }}>
                  លេខទូរស័ព្ទទំនាក់ទំនង
                </label>
                <input
                  className="bc-input"
                  style={{ width: "100%" }}
                  placeholder="ឧ. 012 345 678"
                  value={newShopPhone}
                  onChange={(e) => setNewShopPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="p-lbl" style={{ display: "block", marginBottom: "6px" }}>
                  ចំណាំបន្ថែម (Note)
                </label>
                <input
                  className="bc-input"
                  style={{ width: "100%" }}
                  placeholder="ឧ. បញ្ចុះតម្លៃពេលទិញលើស 20kg"
                  value={newShopNote}
                  onChange={(e) => setNewShopNote(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
                <button
                  type="button"
                  className="bc-btn bc-btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setIsAddShopOpen(false)}
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="bc-btn bc-btn-primary"
                  style={{ flex: 1 }}
                  disabled={createSupplierMutation.isPending}
                >
                  {createSupplierMutation.isPending ? "កំពុងរក្សាទុក..." : "រក្សាទុកហាង"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal 2: Add Product to Supplier ─── */}
      {isAddProductOpen && selectedShop && (
        <div className="p-scrim" onClick={() => setIsAddProductOpen(false)}>
          <div
            className="p-sheet"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "480px", margin: "auto" }}
          >
            <div className="p-grab" />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "20px" }}>+ បន្ថែមមុខទំនិញថ្មី</h2>
                <div className="p-muted" style={{ fontSize: "13px" }}>
                  ផ្គត់ផ្គង់ដោយ: <b>{selectedShop.name}</b>
                </div>
              </div>
              <button
                type="button"
                className="bc-iconbtn"
                onClick={() => setIsAddProductOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="p-lbl" style={{ display: "block", marginBottom: "6px" }}>
                  ឈ្មោះទំនិញ (Product name) *
                </label>
                <input
                  className="bc-input"
                  style={{ width: "100%" }}
                  placeholder="ឧ. សាច់គោបន្ទះ, ស្ពៃបូកគោ, ខ្ទឹមស..."
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label className="p-lbl" style={{ display: "block", marginBottom: "6px" }}>
                    ខ្នាត (Unit) *
                  </label>
                  <input
                    className="bc-input"
                    style={{ width: "100%" }}
                    placeholder="ឧ. គីឡូ, ដប, កេស, បាវ"
                    value={newProdUnit}
                    onChange={(e) => setNewProdUnit(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="p-lbl" style={{ display: "block", marginBottom: "6px" }}>
                    រូបិយប័ណ្ណ (Currency)
                  </label>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      type="button"
                      className={`bc-btn ${newProdCur === "USD" ? "bc-btn-primary" : "bc-btn-secondary"}`}
                      style={{ flex: 1, minHeight: "42px", padding: 0 }}
                      onClick={() => setNewProdCur("USD")}
                    >
                      USD ($)
                    </button>
                    <button
                      type="button"
                      className={`bc-btn ${newProdCur === "KHR" ? "bc-btn-primary" : "bc-btn-secondary"}`}
                      style={{ flex: 1, minHeight: "42px", padding: 0 }}
                      onClick={() => setNewProdCur("KHR")}
                    >
                      KHR (៛)
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="p-lbl" style={{ display: "block", marginBottom: "6px" }}>
                  តម្លៃគោល (Default Price {newProdCur})
                </label>
                <input
                  type="number"
                  step="any"
                  className="bc-input"
                  style={{ width: "100%" }}
                  placeholder={newProdCur === "USD" ? "ឧ. 4.50" : "ឧ. 18000"}
                  value={newProdPrice}
                  onChange={(e) => setNewProdPrice(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
                <button
                  type="button"
                  className="bc-btn bc-btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setIsAddProductOpen(false)}
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="bc-btn bc-btn-primary"
                  style={{ flex: 1 }}
                  disabled={createProductMutation.isPending}
                >
                  {createProductMutation.isPending ? "កំពុងបញ្ចូល..." : "បញ្ចូលទំនិញ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
