"use client";

import React, { useState } from "react";
import { useMarketTripMutation } from "@/hooks/useInvoices";
import { useShops, useProducts, Shop, Product } from "@/hooks/useMasterData";
import BonchiIcon from "./BonchiIcon";
import { formatUsd, formatKhr } from "@/lib/utils";

interface MarketTripModalProps {
  isOpen: boolean;
  initialSupplier?: Shop | null;
  onClose: () => void;
  onSuccess?: () => void;
  wallets: Array<{ id: string | number; code: string; name_km: string; category: string }>;
}

export interface PurchaseItem {
  id: string;
  product_id?: string | number;
  name: string;
  unit: string;
  qty: number;
  price: number;
  cur: "USD" | "KHR";
  is_paid: boolean; // Each product noted as paid or unpaid
}

export interface SupplierSection {
  id: string;
  supplier_id?: string | number;
  name: string;
  location?: string;
  items: PurchaseItem[];
}

export default function MarketTripModal({
  isOpen,
  initialSupplier,
  onClose,
  onSuccess,
  wallets,
}: MarketTripModalProps) {
  // Real data from database (no mock data)
  const { data: masterShops = [] } = useShops();
  const { data: masterProducts = [] } = useProducts();
  const mutation = useMarketTripMutation();

  // Trip details
  const [tripDate, setTripDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [walletCode, setWalletCode] = useState<string>("petty");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Start with empty suppliers list - ZERO MOCK DATA
  const [supplierSections, setSupplierSections] = useState<SupplierSection[]>([]);

  // If initialSupplier is provided, pre-populate that supplier section
  React.useEffect(() => {
    if (isOpen && initialSupplier) {
      setSupplierSections((prev) => {
        const exists = prev.find((s) => String(s.supplier_id) === String(initialSupplier.id));
        if (exists) return prev;
        return [
          ...prev,
          {
            id: `shop-${Date.now()}`,
            supplier_id: initialSupplier.id,
            name: initialSupplier.name,
            location: initialSupplier.market_location || "ផ្សារ",
            items: [],
          },
        ];
      });
    }
  }, [isOpen, initialSupplier]);

  // Sub-dialog states
  const [isShopPickerOpen, setIsShopPickerOpen] = useState(false);
  const [activeShopForAdd, setActiveShopForAdd] = useState<SupplierSection | null>(null);

  // Custom product adding in sub-dialog
  const [customName, setCustomName] = useState("");
  const [customUnit, setCustomUnit] = useState("គីឡូ");
  const [customPrice, setCustomPrice] = useState("");
  const [customCur, setCustomCur] = useState<"USD" | "KHR">("USD");
  const [customPaid, setCustomPaid] = useState<boolean>(true);

  if (!isOpen) return null;

  // ─── Financial Totals Calculation ───
  let grandTotalUsd = 0;
  let grandTotalKhr = 0;
  let paidUsd = 0;
  let paidKhr = 0;
  let unpaidUsd = 0;
  let unpaidKhr = 0;

  supplierSections.forEach((sec) => {
    sec.items.forEach((it) => {
      const line = (Number(it.qty) || 0) * (Number(it.price) || 0);
      if (it.cur === "USD") {
        grandTotalUsd += line;
        if (it.is_paid) paidUsd += line;
        else unpaidUsd += line;
      } else {
        grandTotalKhr += line;
        if (it.is_paid) paidKhr += line;
        else unpaidKhr += line;
      }
    });
  });

  const totalItemsCount = supplierSections.reduce((sum, s) => sum + s.items.length, 0);

  // ─── Handlers ───

  // Add Supplier to trip
  const handleAddSupplier = (shop: Shop) => {
    const existing = supplierSections.find((s) => String(s.supplier_id) === String(shop.id));
    if (existing) {
      // Already in trip, open product picker for it
      setActiveShopForAdd(existing);
      setIsShopPickerOpen(false);
      return;
    }

    const newSec: SupplierSection = {
      id: `shop-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      supplier_id: shop.id,
      name: shop.name,
      location: shop.market_location || "ផ្សារ",
      items: [],
    };

    setSupplierSections((prev) => [...prev, newSec]);
    setActiveShopForAdd(newSec);
    setIsShopPickerOpen(false);
  };

  const handleRemoveSupplier = (sectionId: string) => {
    setSupplierSections((prev) => prev.filter((s) => s.id !== sectionId));
  };

  // Add product to supplier section
  const handleAddProductToSection = (
    sectionId: string,
    prod: { name: string; unit: string; price: number; cur: "USD" | "KHR"; is_paid?: boolean; id?: string | number }
  ) => {
    const newItem: PurchaseItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      product_id: prod.id,
      name: prod.name,
      unit: prod.unit || "គីឡូ",
      qty: 1,
      price: Number(prod.price) || 0,
      cur: prod.cur || "USD",
      is_paid: prod.is_paid !== undefined ? prod.is_paid : true,
    };

    setSupplierSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, items: [...s.items, newItem] } : s))
    );
    setActiveShopForAdd(null);
  };

  // Update item (qty, unit, price, cur, is_paid)
  const handleUpdateItem = (sectionId: string, itemId: string, updates: Partial<PurchaseItem>) => {
    setSupplierSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          items: sec.items.map((it) => (it.id === itemId ? { ...it, ...updates } : it)),
        };
      })
    );
  };

  // Remove item
  const handleRemoveItem = (sectionId: string, itemId: string) => {
    setSupplierSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          items: sec.items.filter((it) => it.id !== itemId),
        };
      })
    );
  };

  // Toggle all items in a supplier to paid or unpaid
  const handleToggleShopAllPaid = (sectionId: string) => {
    setSupplierSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const allPaid = sec.items.every((it) => it.is_paid);
        return {
          ...sec,
          items: sec.items.map((it) => ({ ...it, is_paid: !allPaid })),
        };
      })
    );
  };

  // Submit trip
  const handleSubmit = async () => {
    const validSections = supplierSections.filter((s) => s.items.length > 0);
    if (!validSections.length) {
      setErrorMsg("សូមជ្រើសរើសហាង និងបញ្ចូលមុខទំនិញយ៉ាងហោចណាស់ 1 មុខ មុននឹងរក្សាទុក");
      return;
    }

    setErrorMsg("");

    try {
      await mutation.mutateAsync({
        trip_date: tripDate,
        wallet_id: walletCode,
        shops: validSections.map((sec) => ({
          supplier_id: sec.supplier_id,
          supplier_name: sec.name,
          items: sec.items.map((it) => ({
            product_name: it.name,
            quantity: Number(it.qty) || 1,
            unit: it.unit || "គីឡូ",
            unit_price: Number(it.price) || 0,
            currency: it.cur,
            is_paid: it.is_paid, // Each product recorded as paid or unpaid
          })),
        })),
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || "ការរក្សាទុកវិក្កយបត្របានបរាជ័យ");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      {/* Dimmed Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(18, 22, 20, 0.65)",
          backdropFilter: "blur(3px)",
        }}
        onClick={onClose}
      />

      {/* Main Dialog Window */}
      <div
        role="dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          zIndex: 10000,
          width: "100%",
          maxWidth: "920px",
          maxHeight: "92vh",
          background: "var(--surface-raised)",
          borderRadius: "20px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.35)",
          border: "1px solid var(--line)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* ─── Top Header ─── */}
        <header
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--surface)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span
              className="bc-disc bc-disc-expense"
              style={{ width: "42px", height: "42px", borderRadius: "12px" }}
            >
              <BonchiIcon name="cart" size={22} />
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>
                កត់ត្រាទិញទំនិញ · ដើរផ្សារ (Product Purchase)
              </h2>
              <div className="p-muted" style={{ fontSize: "12px" }}>
                ទិញពីហាងច្រើនក្នុងពេលតែមួយ · កត់ចំណាំបង់រួច ឬ ជំពាក់តាមមុខទំនិញនីមួយៗ
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="bc-iconbtn"
            style={{ width: "36px", height: "36px", background: "var(--surface-sunken)" }}
            title="បិទ (Close)"
          >
            ✕
          </button>
        </header>

        {/* ─── Sticky Controls: Date & Wallet Selector ─── */}
        <div
          style={{
            padding: "10px 20px",
            background: "var(--surface-sunken)",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
              📅 កាលបរិច្ឆេទ:
              <input
                type="date"
                value={tripDate}
                onChange={(e) => setTripDate(e.target.value)}
                className="bc-input"
                style={{ padding: "4px 8px", fontSize: "13px", width: "140px" }}
              />
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
              👛 កាត់ប្រាក់ពីកាបូប:
              <select
                value={walletCode}
                onChange={(e) => setWalletCode(e.target.value)}
                className="bc-input"
                style={{ padding: "4px 10px", fontSize: "13px" }}
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.code}>
                    {w.name_km} ({w.category === "cash" ? "Cash" : "Bank"})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "12px" }}>
            <span className="bc-badge" style={{ background: "var(--surface-raised)" }}>
              {supplierSections.length} ហាង
            </span>
            <span className="bc-badge" style={{ background: "var(--surface-raised)" }}>
              {totalItemsCount} មុខទំនិញ
            </span>
          </div>
        </div>

        {/* ─── Scrollable Purchase Body ─── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          {errorMsg && (
            <div className="bc-banner bc-banner-danger" role="alert">
              <BonchiIcon name="alert" size={20} />
              <div className="bc-banner-main">{errorMsg}</div>
            </div>
          )}

          {/* If No Suppliers Selected Yet (ZERO MOCK DATA STATE) */}
          {supplierSections.length === 0 ? (
            <div
              style={{
                border: "2px dashed var(--line)",
                borderRadius: "16px",
                padding: "36px 20px",
                textAlign: "center",
                background: "var(--surface)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <span className="bc-disc bc-disc-brand" style={{ width: 54, height: 54 }}>
                <BonchiIcon name="cart" size={28} />
              </span>
              <div>
                <h3 style={{ margin: "0 0 6px 0", fontSize: "17px", fontWeight: 700 }}>
                  ចាប់ផ្តើមជ្រើសរើសហាងផ្គត់ផ្គង់ (Choose Supplier)
                </h3>
                <p className="p-muted" style={{ margin: 0, fontSize: "13px", maxWidth: "440px" }}>
                  អ្នកអាចទិញពីហាងច្រើនក្នុងពេលតែមួយ។ សូមជ្រើសរើសហាងដែលអ្នកបានទិញទំនិញ៖
                </p>
              </div>

              {/* Quick Supplier Chips from Real Database */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", maxWidth: "600px" }}>
                {masterShops.map((sh) => (
                  <button
                    key={sh.id}
                    type="button"
                    onClick={() => handleAddSupplier(sh)}
                    className="p-chip p-chip-on"
                    style={{ fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    <span>🏪 {sh.name}</span>
                    <small style={{ opacity: 0.7 }}>({sh.product_count ?? 0} មុខ)</small>
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="bc-btn bc-btn-primary"
                onClick={() => setIsShopPickerOpen(true)}
                style={{ minHeight: "42px", marginTop: "8px" }}
              >
                <BonchiIcon name="plus" size={18} />
                + បន្ថែមហាងផ្គត់ផ្គង់
              </button>
            </div>
          ) : (
            /* Render Each Supplier Section */
            supplierSections.map((sec, secIdx) => {
              let secUsd = 0;
              let secKhr = 0;
              let secUnpaidUsd = 0;
              let secUnpaidKhr = 0;

              sec.items.forEach((it) => {
                const line = (Number(it.qty) || 0) * (Number(it.price) || 0);
                if (it.cur === "USD") {
                  secUsd += line;
                  if (!it.is_paid) secUnpaidUsd += line;
                } else {
                  secKhr += line;
                  if (!it.is_paid) secUnpaidKhr += line;
                }
              });

              return (
                <div
                  key={sec.id}
                  style={{
                    background: "var(--surface)",
                    border: "1.5px solid var(--line)",
                    borderRadius: "16px",
                    overflow: "hidden",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                  }}
                >
                  {/* Supplier Card Header */}
                  <div
                    style={{
                      background: "var(--surface-raised)",
                      padding: "10px 16px",
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      borderBottom: "1px solid var(--line)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span
                        style={{
                          background: "var(--brand)",
                          color: "#fff",
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "12px",
                        }}
                      >
                        {secIdx + 1}
                      </span>
                      <div>
                        <b style={{ fontSize: "15px", color: "var(--ink)" }}>{sec.name}</b>
                        <span className="p-muted" style={{ fontSize: "12px", marginLeft: "8px" }}>
                          📍 {sec.location || "ផ្សារ"}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      {/* Subtotal */}
                      <div style={{ textAlign: "right" }}>
                        <span className="font-bold" style={{ fontSize: "13px" }}>
                          {secUsd > 0 && formatUsd(secUsd)} {secKhr > 0 && formatKhr(secKhr)}
                          {secUsd === 0 && secKhr === 0 && "0"}
                        </span>
                        {secUnpaidUsd > 0 || secUnpaidKhr > 0 ? (
                          <div style={{ fontSize: "11px", color: "var(--warning)", fontWeight: 600 }}>
                            (ជំពាក់: {secUnpaidUsd > 0 ? formatUsd(secUnpaidUsd) : ""}{" "}
                            {secUnpaidKhr > 0 ? formatKhr(secUnpaidKhr) : ""})
                          </div>
                        ) : null}
                      </div>

                      {/* Quick batch toggle for this supplier */}
                      {sec.items.length > 0 && (
                        <button
                          type="button"
                          className="text-[11px] px-2 py-1 rounded bg-[var(--surface-sunken)] border border-[var(--line)] font-medium hover:bg-[var(--line)] cursor-pointer"
                          onClick={() => handleToggleShopAllPaid(sec.id)}
                          title="ចុចដើម្បីប្តូរទាំងអស់ទៅជាបង់រួច ឬជំពាក់"
                        >
                          {sec.items.every((it) => it.is_paid) ? "ប្តូរទៅ ជំពាក់ទាំងអស់" : "ប្តូរទៅ បង់រួចទាំងអស់"}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveSupplier(sec.id)}
                        className="bc-iconbtn"
                        style={{ color: "var(--expense)", width: "30px", height: "30px" }}
                        title="លុបហាងនេះ"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Items List */}
                  <div style={{ padding: "10px 14px" }}>
                    {sec.items.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {sec.items.map((it) => {
                          const lineTotal = (Number(it.qty) || 0) * (Number(it.price) || 0);

                          return (
                            <div
                              key={it.id}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "minmax(120px, 1.8fr) 100px 75px 120px 95px 110px 32px",
                                gap: "8px",
                                alignItems: "center",
                                padding: "6px 10px",
                                borderRadius: "10px",
                                background: it.is_paid ? "var(--surface-raised)" : "rgba(245, 158, 11, 0.08)",
                                border: it.is_paid ? "1px solid var(--line)" : "1px solid rgba(245, 158, 11, 0.4)",
                              }}
                            >
                              {/* 1. Product Name */}
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span className="bc-disc bc-disc-brand" style={{ width: 24, height: 24, flexShrink: 0 }}>
                                  <BonchiIcon name="leaf" size={13} />
                                </span>
                                <input
                                  className="bc-input"
                                  style={{
                                    padding: "3px 6px",
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    border: "none",
                                    background: "transparent",
                                    width: "100%",
                                  }}
                                  value={it.name}
                                  onChange={(e) => handleUpdateItem(sec.id, it.id, { name: e.target.value })}
                                  placeholder="ឈ្មោះទំនិញ"
                                />
                              </div>

                              {/* 2. Editable Quantity with stepper */}
                              <div>
                                <div style={{ fontSize: "10px", color: "var(--muted)", marginBottom: "1px" }}>
                                  ចំនួន Qty
                                </div>
                                <div style={{ display: "flex", alignItems: "center" }}>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItem(sec.id, it.id, { qty: Math.max(0.1, Number((it.qty - 1).toFixed(2))) })}
                                    style={{
                                      width: "22px",
                                      height: "28px",
                                      border: "1px solid var(--line)",
                                      background: "var(--surface-sunken)",
                                      borderTopLeftRadius: "6px",
                                      borderBottomLeftRadius: "6px",
                                      cursor: "pointer",
                                    }}
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    step="any"
                                    className="bc-input"
                                    style={{
                                      padding: "2px 4px",
                                      fontSize: "12px",
                                      width: "50px",
                                      textAlign: "center",
                                      fontWeight: 600,
                                      borderRadius: 0,
                                      borderLeft: "none",
                                      borderRight: "none",
                                      height: "28px",
                                    }}
                                    value={it.qty}
                                    onChange={(e) => handleUpdateItem(sec.id, it.id, { qty: parseFloat(e.target.value) || 0 })}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItem(sec.id, it.id, { qty: Number((it.qty + 1).toFixed(2)) })}
                                    style={{
                                      width: "22px",
                                      height: "28px",
                                      border: "1px solid var(--line)",
                                      background: "var(--surface-sunken)",
                                      borderTopRightRadius: "6px",
                                      borderBottomRightRadius: "6px",
                                      cursor: "pointer",
                                    }}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              {/* 3. Unit */}
                              <div>
                                <div style={{ fontSize: "10px", color: "var(--muted)", marginBottom: "1px" }}>
                                  ខ្នាត Unit
                                </div>
                                <input
                                  className="bc-input"
                                  style={{ padding: "3px 6px", fontSize: "12px", width: "100%", textAlign: "center", height: "28px" }}
                                  value={it.unit}
                                  onChange={(e) => handleUpdateItem(sec.id, it.id, { unit: e.target.value })}
                                />
                              </div>

                              {/* 4. Editable Unit Price */}
                              <div>
                                <div style={{ fontSize: "10px", color: "var(--muted)", marginBottom: "1px" }}>
                                  តម្លៃរាយ Price
                                </div>
                                <div style={{ position: "relative" }}>
                                  <input
                                    type="number"
                                    step="any"
                                    className="bc-input"
                                    style={{ padding: "3px 6px 3px 18px", fontSize: "12px", width: "100%", fontWeight: 600, height: "28px" }}
                                    value={it.price}
                                    onChange={(e) => handleUpdateItem(sec.id, it.id, { price: parseFloat(e.target.value) || 0 })}
                                  />
                                  <span style={{ position: "absolute", left: "6px", top: "50%", transform: "translateY(-50%)", fontSize: "11px", color: "var(--muted)" }}>
                                    {it.cur === "USD" ? "$" : "៛"}
                                  </span>
                                </div>
                              </div>

                              {/* 5. Currency Toggle ($ vs ៛) */}
                              <div>
                                <div style={{ fontSize: "10px", color: "var(--muted)", marginBottom: "1px" }}>
                                  រូបិយប័ណ្ណ
                                </div>
                                <div style={{ display: "flex", gap: "2px" }}>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItem(sec.id, it.id, { cur: "USD" })}
                                    style={{
                                      flex: 1,
                                      height: "26px",
                                      fontSize: "10px",
                                      fontWeight: 700,
                                      borderRadius: "4px",
                                      border: it.cur === "USD" ? "1px solid var(--brand)" : "1px solid var(--line)",
                                      background: it.cur === "USD" ? "var(--brand)" : "var(--surface)",
                                      color: it.cur === "USD" ? "#fff" : "var(--ink)",
                                      cursor: "pointer",
                                    }}
                                  >
                                    $
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItem(sec.id, it.id, { cur: "KHR" })}
                                    style={{
                                      flex: 1,
                                      height: "26px",
                                      fontSize: "10px",
                                      fontWeight: 700,
                                      borderRadius: "4px",
                                      border: it.cur === "KHR" ? "1px solid var(--brand)" : "1px solid var(--line)",
                                      background: it.cur === "KHR" ? "var(--brand)" : "var(--surface)",
                                      color: it.cur === "KHR" ? "#fff" : "var(--ink)",
                                      cursor: "pointer",
                                    }}
                                  >
                                    ៛
                                  </button>
                                </div>
                              </div>

                              {/* 6. Subtotal & Requirement #4: Note Paid vs Unpaid */}
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
                                <span className="bc-money font-bold" style={{ fontSize: "13px" }}>
                                  {it.cur === "USD" ? formatUsd(lineTotal) : formatKhr(lineTotal)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItem(sec.id, it.id, { is_paid: !it.is_paid })}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "3px",
                                    fontSize: "10px",
                                    fontWeight: 700,
                                    padding: "2px 6px",
                                    borderRadius: "5px",
                                    border: "none",
                                    cursor: "pointer",
                                    background: it.is_paid ? "rgba(16, 185, 129, 0.16)" : "rgba(245, 158, 11, 0.22)",
                                    color: it.is_paid ? "#059669" : "#d97706",
                                    transition: "all 0.15s ease",
                                  }}
                                  title="ចុចដើម្បីប្តូរស្ថានភាព បង់រួច / ជំពាក់"
                                >
                                  {it.is_paid ? "✓ បង់រួច" : "⏳ ជំពាក់"}
                                </button>
                              </div>

                              {/* 7. Delete Item Button */}
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(sec.id, it.id)}
                                className="bc-iconbtn"
                                style={{ width: "26px", height: "26px", color: "var(--muted)", margin: "auto" }}
                                title="លុបទំនិញនេះ"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-muted" style={{ textAlign: "center", padding: "10px 0", fontSize: "12px" }}>
                        មិនទាន់មានមុខទំនិញក្នុងហាងនេះនៅឡើយទេ
                      </div>
                    )}

                    {/* Add product button under this supplier */}
                    <div style={{ marginTop: "8px" }}>
                      <button
                        type="button"
                        className="bc-btn bc-btn-secondary"
                        onClick={() => setActiveShopForAdd(sec)}
                        style={{ minHeight: "34px", fontSize: "12px" }}
                      >
                        <BonchiIcon name="plus" size={15} />
                        + បន្ថែមទំនិញពីហាង {sec.name}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Add Another Supplier Button */}
          {supplierSections.length > 0 && (
            <button
              type="button"
              className="bc-btn bc-btn-secondary"
              onClick={() => setIsShopPickerOpen(true)}
              style={{
                minHeight: "44px",
                borderStyle: "dashed",
                borderWidth: "1.5px",
                background: "transparent",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              <BonchiIcon name="plus" size={18} />
              + បន្ថែមហាងផ្គត់ផ្គង់មួយទៀត (Add Another Supplier)
            </button>
          )}
        </div>

        {/* ─── Financial Summary Footer ─── */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1.5px solid var(--line)",
            background: "var(--surface)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {/* Summary Row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr 1fr",
              gap: "10px",
              alignItems: "center",
              background: "var(--surface-raised)",
              padding: "10px 14px",
              borderRadius: "12px",
              border: "1px solid var(--line)",
            }}
          >
            {/* Grand Total */}
            <div>
              <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                សរុបដើរផ្សារទាំងអស់ · Grand Total
              </div>
              <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--expense)" }}>
                {grandTotalUsd > 0 && formatUsd(grandTotalUsd)}
                {grandTotalUsd > 0 && grandTotalKhr > 0 && " + "}
                {grandTotalKhr > 0 && formatKhr(grandTotalKhr)}
                {grandTotalUsd === 0 && grandTotalKhr === 0 && "$0.00"}
              </div>
            </div>

            {/* Paid Amount */}
            <div style={{ borderLeft: "1px solid var(--line)", paddingLeft: "12px" }}>
              <div style={{ fontSize: "11px", color: "#059669", textTransform: "uppercase", fontWeight: 700 }}>
                ✓ បានបង់ភ្លាម (Paid)
              </div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#059669" }}>
                {paidUsd > 0 && formatUsd(paidUsd)}
                {paidUsd > 0 && paidKhr > 0 && " + "}
                {paidKhr > 0 && formatKhr(paidKhr)}
                {paidUsd === 0 && paidKhr === 0 && "$0.00"}
              </div>
            </div>

            {/* Unpaid Amount */}
            <div style={{ borderLeft: "1px solid var(--line)", paddingLeft: "12px" }}>
              <div style={{ fontSize: "11px", color: "var(--warning)", textTransform: "uppercase", fontWeight: 700 }}>
                ⏳ ជំពាក់ហាង (Owed)
              </div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--warning)" }}>
                {unpaidUsd > 0 && formatUsd(unpaidUsd)}
                {unpaidUsd > 0 && unpaidKhr > 0 && " + "}
                {unpaidKhr > 0 && formatKhr(unpaidKhr)}
                {unpaidUsd === 0 && unpaidKhr === 0 && "0 (គ្មាន)"}
              </div>
            </div>
          </div>

          {/* Action Button Row */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              type="button"
              className="bc-btn bc-btn-secondary"
              onClick={onClose}
              style={{ minHeight: "44px", flex: "0 0 110px" }}
            >
              បោះបង់
            </button>

            <button
              type="button"
              className="p-btn"
              onClick={handleSubmit}
              disabled={mutation.isPending || totalItemsCount === 0}
              style={{
                flex: 1,
                minHeight: "44px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <BonchiIcon name="check" size={18} />
              {mutation.isPending
                ? "កំពុងរក្សាទុក..."
                : `រក្សាទុកប្រតិបត្តិការ (${supplierSections.length} ហាង · ${totalItemsCount} មុខ)`}
            </button>
          </div>
        </div>

        {/* ─── Sub-Dialog: Choose Supplier ─── */}
        {isShopPickerOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10050,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              background: "rgba(0,0,0,0.5)",
            }}
            onClick={() => setIsShopPickerOpen(false)}
          >
            <div
              role="dialog"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: "460px",
                background: "var(--surface-raised)",
                borderRadius: "16px",
                padding: "16px",
                border: "1px solid var(--line)",
                boxShadow: "0 16px 40px rgba(0,0,0,0.3)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700 }}>ជ្រើសរើសហាងផ្គត់ផ្គង់</h3>
                  <div className="p-muted" style={{ fontSize: "12px" }}>
                    ចុចលើហាងដើម្បីបន្ថែមទៅក្នុងការដើរផ្សារនេះ
                  </div>
                </div>
                <button type="button" className="bc-iconbtn" onClick={() => setIsShopPickerOpen(false)}>
                  ✕
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "360px", overflowY: "auto" }}>
                {masterShops.map((sh) => (
                  <button
                    key={sh.id}
                    type="button"
                    className="bc-row"
                    onClick={() => handleAddSupplier(sh)}
                    style={{
                      width: "100%",
                      border: "1px solid var(--line)",
                      borderRadius: "10px",
                      background: "var(--surface)",
                      textAlign: "left",
                      cursor: "pointer",
                      padding: "8px 12px",
                    }}
                  >
                    <span className="bc-disc bc-disc-expense" style={{ width: 34, height: 34 }}>
                      <BonchiIcon name="cart" size={17} />
                    </span>
                    <span className="bc-row-main">
                      <b style={{ fontSize: "14px", display: "block" }}>{sh.name}</b>
                      <span className="p-muted" style={{ fontSize: "12px", display: "block" }}>
                        📍 {sh.market_location || "ផ្សារ"} {sh.contact_phone && `· 📞 ${sh.contact_phone}`}
                      </span>
                    </span>
                    <span className="bc-badge" style={{ background: "var(--surface-raised)" }}>
                      {sh.product_count ?? 0} មុខ
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Sub-Dialog: Add Product to Active Supplier ─── */}
        {activeShopForAdd && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10050,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              background: "rgba(0,0,0,0.5)",
            }}
            onClick={() => setActiveShopForAdd(null)}
          >
            <div
              role="dialog"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: "520px",
                maxHeight: "85vh",
                overflowY: "auto",
                background: "var(--surface-raised)",
                borderRadius: "16px",
                padding: "16px",
                border: "1px solid var(--line)",
                boxShadow: "0 16px 40px rgba(0,0,0,0.3)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700 }}>
                    + បន្ថែមទំនិញ · {activeShopForAdd.name}
                  </h3>
                  <div className="p-muted" style={{ fontSize: "12px" }}>
                    ជ្រើសរើសទំនិញរបស់ហាងនេះ ឬបញ្ចូលថ្មីដោយដៃ
                  </div>
                </div>
                <button type="button" className="bc-iconbtn" onClick={() => setActiveShopForAdd(null)}>
                  ✕
                </button>
              </div>

              {/* 1. Real Products from Database for this Supplier */}
              {(() => {
                const shopProds = masterProducts.filter(
                  (p) =>
                    String(p.supplier_id) === String(activeShopForAdd.supplier_id) ||
                    p.supplier_name === activeShopForAdd.name
                );
                const otherProds = masterProducts.filter(
                  (p) =>
                    String(p.supplier_id) !== String(activeShopForAdd.supplier_id) &&
                    p.supplier_name !== activeShopForAdd.name
                );

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "14px" }}>
                    {shopProds.length > 0 && (
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--brand-dark)", textTransform: "uppercase" }}>
                        ⭐ ទំនិញរបស់ហាង {activeShopForAdd.name}
                      </div>
                    )}
                    {shopProds.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="bc-row"
                        onClick={() => handleAddProductToSection(activeShopForAdd.id, p)}
                        style={{
                          width: "100%",
                          border: "1.5px solid var(--brand)",
                          borderRadius: "10px",
                          background: "var(--brand-soft)",
                          textAlign: "left",
                          cursor: "pointer",
                          padding: "8px 10px",
                        }}
                      >
                        <span className="bc-disc bc-disc-brand" style={{ width: 28, height: 28 }}>
                          <BonchiIcon name="leaf" size={15} />
                        </span>
                        <span className="bc-row-main">
                          <b style={{ fontSize: "14px", display: "block" }}>{p.name}</b>
                          <span className="p-muted" style={{ fontSize: "12px" }}>
                            {p.unit} · {p.cur === "USD" ? formatUsd(p.price) : formatKhr(p.price)}
                          </span>
                        </span>
                        <span className={`bc-cur bc-cur-${p.cur}`}>{p.cur}</span>
                      </button>
                    ))}

                    {otherProds.length > 0 && (
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginTop: "8px" }}>
                        ទំនិញទូទៅផ្សេងទៀត
                      </div>
                    )}
                    {otherProds.slice(0, 6).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="bc-row"
                        onClick={() => handleAddProductToSection(activeShopForAdd.id, p)}
                        style={{
                          width: "100%",
                          border: "1px solid var(--line)",
                          borderRadius: "10px",
                          background: "var(--surface)",
                          textAlign: "left",
                          cursor: "pointer",
                          padding: "8px 10px",
                        }}
                      >
                        <span className="bc-disc bc-disc-expense" style={{ width: 28, height: 28 }}>
                          <BonchiIcon name="cart" size={15} />
                        </span>
                        <span className="bc-row-main">
                          <b style={{ fontSize: "13px", display: "block" }}>{p.name}</b>
                          <span className="p-muted" style={{ fontSize: "11px" }}>
                            {p.unit} · {p.cur === "USD" ? formatUsd(p.price) : formatKhr(p.price)}
                          </span>
                        </span>
                        <span className={`bc-cur bc-cur-${p.cur}`}>{p.cur}</span>
                      </button>
                    ))}
                  </div>
                );
              })()}

              {/* 2. Manual Custom Item Input */}
              <div
                style={{
                  background: "var(--surface-sunken)",
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid var(--line)",
                }}
              >
                <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "8px" }}>
                  ✏️ បញ្ចូលទំនិញថ្មីដោយដៃ (Custom Item)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "6px", marginBottom: "6px" }}>
                  <input
                    className="bc-input"
                    placeholder="ឈ្មោះទំនិញ"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    style={{ fontSize: "12px" }}
                  />
                  <input
                    className="bc-input"
                    placeholder="ខ្នាត (គីឡូ, ដប...)"
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    style={{ fontSize: "12px" }}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "8px" }}>
                  <input
                    type="number"
                    step="any"
                    className="bc-input"
                    placeholder="តម្លៃរាយ"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    style={{ fontSize: "12px" }}
                  />
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button
                      type="button"
                      onClick={() => setCustomCur("USD")}
                      className={`bc-btn ${customCur === "USD" ? "bc-btn-primary" : "bc-btn-secondary"}`}
                      style={{ flex: 1, minHeight: "34px", padding: 0, fontSize: "11px" }}
                    >
                      USD ($)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomCur("KHR")}
                      className={`bc-btn ${customCur === "KHR" ? "bc-btn-primary" : "bc-btn-secondary"}`}
                      style={{ flex: 1, minHeight: "34px", padding: 0, fontSize: "11px" }}
                    >
                      KHR (៛)
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  className="bc-btn bc-btn-primary"
                  onClick={() => {
                    if (!customName.trim()) return;
                    handleAddProductToSection(activeShopForAdd.id, {
                      name: customName.trim(),
                      unit: customUnit.trim() || "គីឡូ",
                      price: parseFloat(customPrice) || 0,
                      cur: customCur,
                      is_paid: customPaid,
                    });
                    setCustomName("");
                    setCustomPrice("");
                  }}
                  style={{ width: "100%", minHeight: "36px", fontSize: "13px" }}
                >
                  + បញ្ចូលទំនិញនេះទៅហាង
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
