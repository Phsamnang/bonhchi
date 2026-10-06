"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useMoneyInMutation } from "@/hooks/useInvoices";
import { useTables, useCreateTableMutation } from "@/hooks/useTables";
import { groupWalletsByBank, MergedBankWallet } from "@/hooks/useWallets";
import BonchiIcon from "./BonchiIcon";
import TableListModal from "./TableListModal";
import { formatUsd, formatKhr } from "@/lib/utils";

interface MoneyInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  wallets: Array<{
    id: string | number;
    code: string;
    name_km: string;
    name_en?: string;
    category?: string;
    currency?: string;
    current_usd?: number | string;
    current_khr?: number | string;
    usd?: number | string;
    khr?: number | string;
    current_balance?: number | string;
    opening_balance?: number | string;
  }>;
}

const TABLE_PRESETS = [
  "តុ 1",
  "តុ 2",
  "តុ 3",
  "តុ 4",
  "តុ 5",
  "តុ 6",
  "តុ 7",
  "តុ 8",
  "តុ 9",
  "តុ 10",
  "តុ 11",
  "តុ 12",
  "តុ VIP 1",
  "តុ VIP 2",
  "ខ្ចប់ (Takeaway)",
  "Delivery",
];

export default function MoneyInModal({
  isOpen,
  onClose,
  onSuccess,
  wallets,
}: MoneyInModalProps) {
  const [tableName, setTableName] = useState<string>("តុ 1");
  const [usdAmount, setUsdAmount] = useState<string>("");
  const [khrAmount, setKhrAmount] = useState<string>("");
  const [refNo, setRefNo] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const mergedBankList = useMemo(() => {
    return groupWalletsByBank(wallets as any[]);
  }, [wallets]);

  const [selectedGroupKey, setSelectedGroupKey] = useState<string>(() => {
    const list = groupWalletsByBank(wallets as any[]);
    const drawerGroup = list.find((g) => g.codes.some((c) => c.includes("drawer")));
    return drawerGroup?.groupKey || list[0]?.groupKey || "";
  });

  const { data: dbTables = [], isLoading: isTablesLoading } = useTables();
  const createTableMutation = useCreateTableMutation();
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [tableSearch, setTableSearch] = useState("");
  const [isAddingTableInline, setIsAddingTableInline] = useState(false);
  const [newInlineTableName, setNewInlineTableName] = useState("");

  const tablesList = dbTables.length > 0 ? dbTables.map((t) => t.name) : TABLE_PRESETS;
  const filteredTableList = tablesList.filter((t) =>
    !tableSearch.trim() || t.toLowerCase().includes(tableSearch.trim().toLowerCase())
  );

  const mutation = useMoneyInMutation();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Ensure selectedGroupKey is valid when wallets change
  useEffect(() => {
    if (mergedBankList.length > 0 && !mergedBankList.some((g) => g.groupKey === selectedGroupKey)) {
      const drawerGroup = mergedBankList.find((g) => g.codes.some((c) => c.includes("drawer")));
      setSelectedGroupKey(drawerGroup ? drawerGroup.groupKey : mergedBankList[0].groupKey);
    }
  }, [mergedBankList, selectedGroupKey]);

  if (!isOpen) return null;

  const numUsd = parseFloat(usdAmount) || 0;
  const numKhr = parseFloat(khrAmount) || 0;
  const hasValidAmount = numUsd > 0 || numKhr > 0;

  const selectedBank =
    mergedBankList.find((g) => g.groupKey === selectedGroupKey) || mergedBankList[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasValidAmount) {
      setErrorMsg("សូមបញ្ចូលចំនួនទឹកប្រាក់យ៉ាងហោចណាស់មួយ (USD ឬ KHR)");
      return;
    }

    const trimmedTable = tableName.trim();
    if (!trimmedTable) {
      setErrorMsg("សូមជ្រើសរើស ឬ បញ្ចូលឈ្មោះតុ");
      return;
    }

    setErrorMsg("");

    try {
      const chosenBank =
        mergedBankList.find((g) => g.groupKey === selectedGroupKey) || mergedBankList[0];
      const usdWallet = chosenBank?.wallets.find((w) => (w.currency || "USD") === "USD");
      const khrWallet = chosenBank?.wallets.find((w) => (w.currency || "USD") === "KHR");

      // Primary wallet fallback
      const primaryWallet =
        (numUsd > 0 && usdWallet) ||
        (numKhr > 0 && khrWallet) ||
        usdWallet ||
        khrWallet ||
        chosenBank?.wallets[0];

      await mutation.mutateAsync({
        date,
        table_name: trimmedTable,
        wallet_id: primaryWallet?.id,
        wallet_code: primaryWallet?.code,
        usd_wallet_id: usdWallet?.id,
        khr_wallet_id: khrWallet?.id,
        amount_usd: numUsd > 0 ? numUsd : undefined,
        amount_khr: numKhr > 0 ? numKhr : undefined,
        source_name: trimmedTable,
        category_name: "ចំណូលលក់",
        reference_no: refNo.trim() || undefined,
        note: note.trim() || undefined,
      });

      // Reset form
      setUsdAmount("");
      setKhrAmount("");
      setRefNo("");
      setNote("");
      setErrorMsg("");

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "បរាជ័យក្នុងការកត់ត្រាចំណូល");
    }
  };

  const getBankIcon = (g: MergedBankWallet) => {
    if (g.codes.some((c) => c.includes("drawer"))) return "wallet";
    if (g.codes.some((c) => c.includes("bakong"))) return "coins";
    if (g.category === "bank") return "bank";
    return "wallet";
  };

  return (
    <>
      {/* Dimmed Backdrop */}
      <div className="p-scrim" onClick={onClose} aria-label="បិទ Close" />

      {/* Sheet / Screen Modal Container */}
      <div
        className="p-sheet p-screen"
        style={{
          maxHeight: "92vh",
          padding: 0,
          display: "flex",
          flexDirection: "column",
          zIndex: 1000,
        }}
        role="dialog"
        aria-modal="true"
      >
        {/* App Bar Header */}
        <header
          className="bc-appbar bc-appbar-back"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
            <button type="button" onClick={onClose} className="bc-iconbtn" aria-label="ត្រឡប់ Back">
              <BonchiIcon name="back" />
            </button>
            <div className="bc-appbar-t">
              <b>កត់ត្រាចំណូលពីតុ · Table Sales</b>
              <small>ជ្រើសរើសតុ បញ្ចូលទឹកប្រាក់ និង កាបូបទទួល</small>
            </div>
          </div>
          <button type="button" onClick={onClose} className="bc-iconbtn" aria-label="បិទ Close">
            <BonchiIcon name="x" size={20} />
          </button>
        </header>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}
        >
          <div
            className="p-body"
            style={{
              gap: "18px",
              padding: "16px 20px",
              overflowY: "auto",
              flex: 1,
            }}
          >
            {/* Error Banner */}
            {errorMsg && (
              <div className="bc-banner bc-banner-danger" role="alert">
                <BonchiIcon name="alert" size={18} />
                <div className="bc-banner-main">{errorMsg}</div>
              </div>
            )}

            {/* 1. SELECT TABLE SECTION */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <label className="bc-field-label" style={{ margin: 0, fontWeight: 700 }}>
                  ១. ជ្រើសរើសឈ្មោះតុ · Select Table <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {tableName && (
                    <span style={{ fontSize: "12px", color: "var(--income)", fontWeight: 600 }}>
                      បានជ្រើស: {tableName}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsTableModalOpen(true)}
                    className="bc-btn bc-btn-secondary"
                    style={{
                      padding: "3px 8px",
                      fontSize: "11px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                    title="មើលបញ្ជីតុទាំងអស់ / គ្រប់គ្រងតុ"
                  >
                    <BonchiIcon name="table" size={13} />
                    <span>បញ្ជីតុ ({dbTables.length || tablesList.length})</span>
                  </button>
                </div>
              </div>

              {/* Table search & quick add row */}
              <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "8px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--muted)",
                    }}
                  >
                    <BonchiIcon name="search" size={14} />
                  </span>
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="ស្វែងរកតុក្នុងបញ្ជី... (Filter tables)"
                    style={{
                      width: "100%",
                      padding: "6px 8px 6px 28px",
                      borderRadius: "6px",
                      border: "1px solid var(--line)",
                      fontSize: "12px",
                      background: "var(--surface)",
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingTableInline(!isAddingTableInline)}
                  className="bc-btn bc-btn-secondary"
                  style={{ padding: "4px 10px", fontSize: "12px", whiteSpace: "nowrap" }}
                >
                  {isAddingTableInline ? "បិទ" : "+ តុថ្មី"}
                </button>
              </div>

              {/* Quick Inline Add Table */}
              {isAddingTableInline && (
                <div
                  style={{
                    display: "flex",
                    gap: "6px",
                    marginBottom: "8px",
                    padding: "8px",
                    background: "var(--surface-raised, #f9fafb)",
                    borderRadius: "8px",
                    border: "1px solid var(--line)",
                  }}
                >
                  <input
                    type="text"
                    value={newInlineTableName}
                    onChange={(e) => setNewInlineTableName(e.target.value)}
                    placeholder="វាយបញ្ចូលឈ្មោះតុថ្មី (ឧ. តុ VIP 3)..."
                    style={{
                      flex: 1,
                      padding: "6px 8px",
                      borderRadius: "6px",
                      border: "1px solid var(--line)",
                      fontSize: "12px",
                      background: "var(--surface)",
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    disabled={!newInlineTableName.trim() || createTableMutation.isPending}
                    onClick={async () => {
                      const trimmed = newInlineTableName.trim();
                      if (!trimmed) return;
                      try {
                        await createTableMutation.mutateAsync({ name: trimmed });
                        setTableName(trimmed);
                        setNewInlineTableName("");
                        setIsAddingTableInline(false);
                      } catch (err: any) {
                        alert(err?.message || "បរាជ័យក្នុងការបង្កើតតុថ្មី");
                      }
                    }}
                    className="bc-btn bc-btn-primary"
                    style={{ padding: "6px 12px", fontSize: "12px" }}
                  >
                    រក្សាទុក
                  </button>
                </div>
              )}

              {/* LIST DOWN CONTAINER */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  maxHeight: "165px",
                  overflowY: "auto",
                  padding: "4px",
                  background: "var(--surface-raised, #f9fafb)",
                  border: "1px solid var(--line)",
                  borderRadius: "8px",
                  marginBottom: "8px",
                }}
              >
                {filteredTableList.length === 0 ? (
                  <div style={{ padding: "12px", textAlign: "center", fontSize: "12px", color: "var(--muted)" }}>
                    រកមិនឃើញតុដែលមានឈ្មោះ &quot;{tableSearch}&quot; ទេ
                  </div>
                ) : (
                  filteredTableList.map((t) => {
                    const isSelected = tableName === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTableName(t)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "7px 12px",
                          borderRadius: "6px",
                          fontSize: "13px",
                          fontWeight: isSelected ? 700 : 500,
                          border: isSelected ? "1.5px solid var(--income)" : "1px solid transparent",
                          background: isSelected ? "var(--income-bg, rgba(16, 185, 129, 0.12))" : "var(--surface)",
                          color: isSelected ? "var(--income)" : "var(--ink)",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.12s ease",
                        }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <BonchiIcon name="table" size={15} />
                          <span>{t}</span>
                        </span>
                        {isSelected ? (
                          <span style={{ fontSize: "12px", color: "var(--income)", fontWeight: 700 }}>
                            ✓ បានជ្រើស
                          </span>
                        ) : (
                          <span style={{ fontSize: "11px", color: "var(--muted)" }}>ជ្រើស</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Custom Table Input */}
              <div className="bc-input" style={{ display: "flex", alignItems: "center", position: "relative" }}>
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  placeholder="ឬ វាយបញ្ចូលឈ្មោះតុផ្សេងទៀត (ឧ. តុ VIP 3, ជាន់លើ...)"
                  style={{ width: "100%", paddingRight: "36px" }}
                  required
                />
                {tableName && (
                  <button
                    type="button"
                    onClick={() => setTableName("")}
                    style={{
                      position: "absolute",
                      right: "8px",
                      background: "transparent",
                      border: "none",
                      color: "var(--muted)",
                      cursor: "pointer",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center",
                    }}
                    title="លុបឈ្មោះតុ Clear"
                  >
                    <BonchiIcon name="x" size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* 2. ENTER AMOUNT SECTION */}
            <div>
              <label className="bc-field-label" style={{ marginBottom: "8px", display: "block", fontWeight: 700 }}>
                ២. ចំនួនទឹកប្រាក់ទទួលបាន · Amount Received <span style={{ color: "var(--danger)" }}>*</span>
                <small style={{ color: "var(--muted)", marginLeft: "6px", fontWeight: 400 }}>
                  (អាចបញ្ចូលទាំង ដុល្លារ ឬ រៀល)
                </small>
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {/* USD Card */}
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: "12px",
                    border: numUsd > 0 ? "2px solid var(--income)" : "1px solid var(--line)",
                    background: numUsd > 0 ? "var(--surface-raised, #ffffff)" : "var(--surface)",
                    boxShadow: numUsd > 0 ? "0 2px 8px rgba(16, 185, 129, 0.1)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
                      ដុល្លារ · USD ($)
                    </span>
                    {numUsd > 0 && (
                      <button
                        type="button"
                        onClick={() => setUsdAmount("")}
                        style={{ border: 0, background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: "11px" }}
                      >
                        លុប
                      </button>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "20px", fontWeight: 800, color: "var(--income)" }}>$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={usdAmount}
                      onChange={(e) => setUsdAmount(e.target.value)}
                      style={{
                        width: "100%",
                        border: 0,
                        outline: "none",
                        fontSize: "20px",
                        fontWeight: 700,
                        background: "transparent",
                        color: "var(--ink)",
                      }}
                    />
                  </div>
                  {numUsd > 0 && selectedBank && (
                    <div style={{ fontSize: "11px", color: "var(--income)", fontWeight: 600, marginTop: "4px" }}>
                      ✓ នឹងចូលកាបូប USD របស់ &quot;{selectedBank.name_km}&quot;
                    </div>
                  )}
                </div>

                {/* KHR Card */}
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: "12px",
                    border: numKhr > 0 ? "2px solid var(--income)" : "1px solid var(--line)",
                    background: numKhr > 0 ? "var(--surface-raised, #ffffff)" : "var(--surface)",
                    boxShadow: numKhr > 0 ? "0 2px 8px rgba(16, 185, 129, 0.1)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
                      រៀល · KHR (៛)
                    </span>
                    {numKhr > 0 && (
                      <button
                        type="button"
                        onClick={() => setKhrAmount("")}
                        style={{ border: 0, background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: "11px" }}
                      >
                        លុប
                      </button>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "20px", fontWeight: 800, color: "var(--income)" }}>៛</span>
                    <input
                      type="number"
                      step="100"
                      min="0"
                      placeholder="0"
                      value={khrAmount}
                      onChange={(e) => setKhrAmount(e.target.value)}
                      style={{
                        width: "100%",
                        border: 0,
                        outline: "none",
                        fontSize: "20px",
                        fontWeight: 700,
                        background: "transparent",
                        color: "var(--ink)",
                      }}
                    />
                  </div>
                  {numKhr > 0 && selectedBank && (
                    <div style={{ fontSize: "11px", color: "var(--income)", fontWeight: 600, marginTop: "4px" }}>
                      ✓ នឹងចូលកាបូប KHR របស់ &quot;{selectedBank.name_km}&quot;
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. SELECT TARGET WALLET SECTION */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <label className="bc-field-label" style={{ margin: 0, fontWeight: 700 }}>
                  ៣. ដាក់ចូលកាបូបណា? · Deposit Into Which Wallet <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                {selectedBank && (
                  <span style={{ fontSize: "12px", color: "var(--income)", fontWeight: 600 }}>
                    បានជ្រើស: {selectedBank.name_km}
                  </span>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px" }}>
                {mergedBankList.map((g) => {
                  const isSelected = selectedGroupKey === g.groupKey;
                  const iconName = getBankIcon(g);
                  return (
                    <button
                      key={g.groupKey}
                      type="button"
                      onClick={() => setSelectedGroupKey(g.groupKey)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        border: isSelected ? "2px solid var(--income)" : "1px solid var(--line)",
                        background: isSelected ? "var(--income-bg, rgba(16, 185, 129, 0.08))" : "var(--surface)",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.15s ease",
                        position: "relative",
                      }}
                    >
                      <span
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: isSelected ? "var(--income)" : "var(--line)",
                          color: isSelected ? "#ffffff" : "var(--ink)",
                          flexShrink: 0,
                        }}
                      >
                        <BonchiIcon name={iconName} size={18} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: isSelected ? 700 : 600, color: "var(--ink)" }}>
                          {g.name_km}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {formatUsd(g.usd)} · {formatKhr(g.khr)}
                        </div>
                      </div>
                      {isSelected && (
                        <span style={{ color: "var(--income)", display: "flex", flexShrink: 0 }}>
                          <BonchiIcon name="check" size={18} strokeWidth={2.5} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. REFERENCE & DATE DETAILS */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "10px" }}>
              <label className="bc-field">
                <span className="bc-field-label">លេខវិក្កយបត្រ POS / Bill # (Optional)</span>
                <span className="bc-input">
                  <input
                    type="text"
                    value={refNo}
                    onChange={(e) => setRefNo(e.target.value)}
                    placeholder="ឧ. #INV-0012 ឬ Shift 1"
                  />
                </span>
              </label>

              <label className="bc-field">
                <span className="bc-field-label">កាលបរិច្ឆេទ · Date</span>
                <span className="bc-input">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </span>
              </label>
            </div>

            {/* 5. OPTIONAL NOTE */}
            <label className="bc-field">
              <span className="bc-field-label">កំណត់ចំណាំបន្ថែម · Note (Optional)</span>
              <span className="bc-input">
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="ចំណាំបន្ថែម (ឧ. ភ្ញៀវបង់លុយសុទ្ធ និង QR)..."
                />
              </span>
            </label>
          </div>

          {/* Footer Actions */}
          <div
            className="p-foot"
            style={{
              padding: "14px 20px",
              borderTop: "1px solid var(--line)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              background: "var(--surface-raised)",
            }}
          >
            <div>
              {hasValidAmount && (
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--income)" }}>
                    សរុប: {numUsd > 0 ? `$${numUsd.toFixed(2)}` : ""} {numUsd > 0 && numKhr > 0 ? " + " : ""} {numKhr > 0 ? `${numKhr.toLocaleString()} ៛` : ""}
                  </div>
                  {selectedBank && (
                    <div style={{ fontSize: "11px", color: "var(--ink-muted)", marginTop: "2px" }}>
                      {numUsd > 0 && numKhr > 0 ? (
                        <span>
                          ដាក់ចូល: <b>{selectedBank.name_km}</b> (USD $\rightarrow$ USD, KHR $\rightarrow$ KHR)
                        </span>
                      ) : numUsd > 0 ? (
                        <span>
                          ដាក់ចូល: <b>{selectedBank.name_km} (USD)</b>
                        </span>
                      ) : numKhr > 0 ? (
                        <span>
                          ដាក់ចូល: <b>{selectedBank.name_km} (KHR)</b>
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                className="bc-btn bc-btn-secondary"
                onClick={onClose}
                disabled={mutation.isPending}
              >
                បោះបង់ Cancel
              </button>
              <button
                type="submit"
                className="bc-btn bc-btn-primary"
                disabled={mutation.isPending || !hasValidAmount || !tableName.trim()}
                style={{
                  background: "var(--income)",
                  borderColor: "var(--income)",
                  color: "#ffffff",
                  minWidth: "160px",
                  fontWeight: 600,
                }}
              >
                {mutation.isPending ? "កំពុងកត់ត្រា..." : "រក្សាទុកចំណូល Save"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Dedicated Table List / Management Modal */}
      <TableListModal
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
        selectedTableName={tableName}
        onSelectTable={(name) => setTableName(name)}
      />
    </>
  );
}
