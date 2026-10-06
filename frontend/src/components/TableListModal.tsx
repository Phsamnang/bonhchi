"use client";

import React, { useState } from "react";
import BonchiIcon from "./BonchiIcon";
import { useTables, useCreateTableMutation, useDeleteTableMutation, RestaurantTable } from "@/hooks/useTables";

interface TableListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTable?: (tableName: string) => void;
  selectedTableName?: string;
}

export default function TableListModal({
  isOpen,
  onClose,
  onSelectTable,
  selectedTableName,
}: TableListModalProps) {
  const { data: tables = [], isLoading, refetch } = useTables();
  const createTableMutation = useCreateTableMutation();
  const deleteTableMutation = useDeleteTableMutation();

  const [search, setSearch] = useState("");
  const [newTableName, setNewTableName] = useState("");
  const [newTableCode, setNewTableCode] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredTables = tables.filter((t) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      t.name.toLowerCase().includes(q) ||
      (t.code && t.code.toLowerCase().includes(q))
    );
  });

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTableName.trim();
    if (!trimmed) {
      setErrorMsg("សូមបញ្ចូលឈ្មោះតុ (Please enter table name)");
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const created = await createTableMutation.mutateAsync({
        name: trimmed,
        code: newTableCode.trim() || undefined,
        sort_order: tables.length + 1,
      });

      setSuccessMsg(`បានបង្កើតតុ "${trimmed}" រួចរាល់!`);
      setNewTableName("");
      setNewTableCode("");
      setIsAdding(false);
      refetch();

      if (onSelectTable) {
        onSelectTable(created.name || trimmed);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "បរាជ័យក្នុងការបង្កើតតុថ្មី");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`តើអ្នកពិតជាចង់លុបតុ "${name}" មែនទេ?`)) return;
    try {
      await deleteTableMutation.mutateAsync(id);
      refetch();
    } catch (err: any) {
      alert(err?.message || "បរាជ័យក្នុងការលុបតុ");
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="p-scrim" onClick={onClose} aria-label="បិទ Close" />

      {/* Modal Card */}
      <div
        className="p-sheet p-screen"
        style={{
          maxHeight: "90vh",
          maxWidth: "520px",
          margin: "auto",
          padding: 0,
          display: "flex",
          flexDirection: "column",
          zIndex: 1010,
        }}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <header
          className="bc-appbar"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(16, 185, 129, 0.12)",
                color: "var(--income, #10b981)",
              }}
            >
              <BonchiIcon name="table" size={20} />
            </span>
            <div>
              <b style={{ fontSize: "16px", display: "block" }}>បញ្ជីឈ្មោះតុ · Tables List</b>
              <small className="p-muted" style={{ fontSize: "12px" }}>
                តុសរុប {tables.length} ក្នុងប្រព័ន្ធ
              </small>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              type="button"
              onClick={() => setIsAdding(!isAdding)}
              className="bc-btn bc-btn-secondary"
              style={{
                padding: "6px 12px",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <BonchiIcon name="plus" size={16} />
              <span>{isAdding ? "បិទ" : "+ តុថ្មី"}</span>
            </button>
            <button type="button" onClick={onClose} className="bc-iconbtn" aria-label="បិទ Close">
              <BonchiIcon name="x" size={20} />
            </button>
          </div>
        </header>

        {/* Body */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "16px 18px",
            gap: "14px",
          }}
        >
          {/* Notifications */}
          {errorMsg && (
            <div className="bc-banner bc-banner-danger" style={{ margin: 0 }}>
              <BonchiIcon name="alert" size={16} />
              <div className="bc-banner-main">{errorMsg}</div>
            </div>
          )}
          {successMsg && (
            <div className="bc-banner" style={{ background: "rgba(16, 185, 129, 0.12)", color: "var(--income)", margin: 0 }}>
              <BonchiIcon name="check" size={16} />
              <div className="bc-banner-main">{successMsg}</div>
            </div>
          )}

          {/* Add New Table Form (Collapsible) */}
          {isAdding && (
            <form
              onSubmit={handleAddTable}
              style={{
                background: "var(--surface-raised, #f9fafb)",
                border: "1px solid var(--line)",
                borderRadius: "12px",
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--ink)" }}>
                + បន្ថែមតុថ្មីទៅក្នុងប្រព័ន្ធ · Add New Table
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "8px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    ឈ្មោះតុ (Table Name) *
                  </label>
                  <input
                    type="text"
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    placeholder="ឧ. តុ VIP 3, រានហាល 1"
                    className="bc-input"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--line)" }}
                    autoFocus
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    កូដតុ (Code)
                  </label>
                  <input
                    type="text"
                    value={newTableCode}
                    onChange={(e) => setNewTableCode(e.target.value)}
                    placeholder="ឧ. T15"
                    className="bc-input"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--line)" }}
                  />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="bc-btn bc-btn-secondary"
                  style={{ padding: "6px 12px", fontSize: "13px" }}
                >
                  បោះបង់ (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={createTableMutation.isPending}
                  className="bc-btn bc-btn-primary"
                  style={{ padding: "6px 16px", fontSize: "13px" }}
                >
                  {createTableMutation.isPending ? "កំពុងរក្សាទុក..." : "រក្សាទុក (Save Table)"}
                </button>
              </div>
            </form>
          )}

          {/* Search Box */}
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}>
              <BonchiIcon name="search" size={16} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ស្វែងរកឈ្មោះតុ... (Search tables)"
              style={{
                width: "100%",
                padding: "8px 12px 8px 34px",
                borderRadius: "8px",
                border: "1px solid var(--line)",
                background: "var(--surface)",
                fontSize: "14px",
              }}
            />
          </div>

          {/* List Down Section */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
              បញ្ជីរាយតុទាំងអស់ · Tables List Down ({filteredTables.length})
            </div>

            {isLoading ? (
              <div style={{ padding: "24px", textAlign: "center", color: "var(--muted)" }}>
                កំពុងទាញទិន្នន័យតុ... (Loading tables...)
              </div>
            ) : filteredTables.length === 0 ? (
              <div
                style={{
                  padding: "30px 16px",
                  textAlign: "center",
                  background: "var(--surface-raised, #f9fafb)",
                  borderRadius: "10px",
                  border: "1px dashed var(--line)",
                  color: "var(--muted)",
                }}
              >
                <BonchiIcon name="table" size={28} className="mx-auto mb-2 opacity-40" />
                <div>រកមិនឃើញតុដែលមានឈ្មោះ &quot;{search}&quot; ទេ</div>
                <button
                  type="button"
                  onClick={() => {
                    setNewTableName(search);
                    setIsAdding(true);
                  }}
                  className="bc-btn bc-btn-secondary"
                  style={{ marginTop: "10px", fontSize: "13px", padding: "6px 12px" }}
                >
                  + បង្កើត &quot;{search}&quot; ជាតុថ្មី
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  maxHeight: "360px",
                  overflowY: "auto",
                }}
              >
                {filteredTables.map((table) => {
                  const isSelected = selectedTableName === table.name;
                  return (
                    <div
                      key={table.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: isSelected
                          ? "1.5px solid var(--income, #10b981)"
                          : "1px solid var(--line)",
                        background: isSelected
                          ? "rgba(16, 185, 129, 0.08)"
                          : "var(--surface)",
                        cursor: onSelectTable ? "pointer" : "default",
                        transition: "all 0.15s ease",
                      }}
                      onClick={() => {
                        if (onSelectTable) {
                          onSelectTable(table.name);
                          onClose();
                        }
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "8px",
                            background: isSelected
                              ? "var(--income, #10b981)"
                              : "var(--surface-raised, #f3f4f6)",
                            color: isSelected ? "#fff" : "var(--ink)",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "12px",
                          }}
                        >
                          <BonchiIcon name="table" size={16} />
                        </span>
                        <div>
                          <div
                            style={{
                              fontWeight: isSelected ? 700 : 600,
                              fontSize: "14px",
                              color: isSelected ? "var(--income, #10b981)" : "var(--ink)",
                            }}
                          >
                            {table.name}
                          </div>
                          {table.code && (
                            <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                              កូដ: {table.code}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontWeight: 600,
                            background: "rgba(16, 185, 129, 0.12)",
                            color: "var(--income, #10b981)",
                          }}
                        >
                          {table.status === "available" ? "ទំនេរ" : table.status}
                        </span>

                        {onSelectTable && (
                          <button
                            type="button"
                            className="bc-btn"
                            style={{
                              padding: "4px 10px",
                              fontSize: "12px",
                              background: isSelected
                                ? "var(--income, #10b981)"
                                : "var(--surface-raised, #f3f4f6)",
                              color: isSelected ? "#fff" : "var(--ink)",
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectTable(table.name);
                              onClose();
                            }}
                          >
                            {isSelected ? "បានជ្រើស ✓" : "ជ្រើសរើស"}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(table.id, table.name);
                          }}
                          className="bc-iconbtn"
                          style={{ color: "var(--danger, #ef4444)", padding: "4px" }}
                          title={`លុបតុ ${table.name}`}
                        >
                          <BonchiIcon name="x" size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer
          style={{
            padding: "12px 18px",
            borderTop: "1px solid var(--line)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="bc-btn bc-btn-secondary"
            style={{ padding: "8px 18px", fontSize: "13px" }}
          >
            បិទ (Close)
          </button>
        </footer>
      </div>
    </>
  );
}
