"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BonchiIcon from "@/components/BonchiIcon";
import { useShops, useCreateSupplierMutation } from "@/hooks/useMasterData";
import { useDashboardContext } from "../DashboardContext";

/** Supplier list. Clicking a supplier opens /suppliers/[id] with all of its products. */
export default function SuppliersPage() {
  const router = useRouter();
  const { showToast } = useDashboardContext();
  const { data: shops = [], isLoading: isLoadingShops } = useShops();

  const [searchShop, setSearchShop] = useState("");
  const [isAddShopOpen, setIsAddShopOpen] = useState(false);

  // New Shop form fields
  const [newShopName, setNewShopName] = useState("");
  const [newShopLocation, setNewShopLocation] = useState("ផ្សារថ្មី");
  const [newShopPhone, setNewShopPhone] = useState("");
  const [newShopNote, setNewShopNote] = useState("");

  const createSupplierMutation = useCreateSupplierMutation();

  const q = searchShop.trim().toLowerCase();
  const filteredShops = shops.filter(
    (s) => s.name.toLowerCase().includes(q) || (s.market_location && s.market_location.toLowerCase().includes(q))
  );

  React.useEffect(() => {
    if (!isAddShopOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsAddShopOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAddShopOpen]);

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
      // Straight to the new supplier, ready to add its products
      router.push(`/suppliers/${created.id}`);
    } catch (err: any) {
      showToast(err.message || "មិនអាចបង្កើតអ្នកផ្គត់ផ្គង់បានទេ");
    }
  };

  return (
    <>
      {/* Search & add supplier */}
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

      <section className="w-panel" style={{ gap: "10px" }}>
        <h2 style={{ margin: 0 }}>
          បញ្ជីហាងផ្គត់ផ្គង់ <small>({filteredShops.length})</small>
        </h2>
        <p className="p-muted" style={{ margin: 0, fontSize: "12.5px" }}>
          ចុចលើហាងណាមួយ ដើម្បីមើលមុខទំនិញទាំងអស់របស់ហាងនោះ
        </p>

        {filteredShops.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
              gap: "10px",
            }}
          >
            {filteredShops.map((sh) => (
              <Link
                key={sh.id}
                href={`/suppliers/${sh.id}`}
                className="p-row transition"
                style={{
                  padding: "12px",
                  borderRadius: "14px",
                  border: "1px solid var(--line)",
                  background: "var(--surface)",
                  color: "inherit",
                  textDecoration: "none",
                }}
              >
                <span className="bc-disc bc-disc-expense" style={{ width: "42px", height: "42px", flexShrink: 0 }}>
                  <BonchiIcon name="cart" size={20} />
                </span>

                <span className="p-grow" style={{ minWidth: 0 }}>
                  <b style={{ fontSize: "15px", color: "var(--ink)", display: "block" }}>{sh.name}</b>
                  <span
                    className="p-muted"
                    style={{ display: "flex", flexWrap: "wrap", gap: "8px", fontSize: "12px", marginTop: "2px" }}
                  >
                    <span>📍 {sh.market_location || "ផ្សារថ្មី"}</span>
                    {sh.contact_phone && <span>📞 {sh.contact_phone}</span>}
                  </span>
                </span>

                <span
                  className="bc-badge"
                  style={{
                    background: "var(--surface-raised)",
                    color: "var(--ink)",
                    fontWeight: 600,
                    fontSize: "12px",
                    padding: "3px 8px",
                    flexShrink: 0,
                  }}
                >
                  {sh.product_count ?? 0} មុខ
                </span>
                <span aria-hidden="true" style={{ color: "var(--ink-muted)", fontSize: "18px", flexShrink: 0 }}>
                  ›
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-muted" style={{ padding: "32px 0", textAlign: "center" }}>
            {isLoadingShops ? "កំពុងទាញទិន្នន័យ..." : "រកមិនឃើញហាងផ្គត់ផ្គង់ទេ"}
          </div>
        )}
      </section>

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

    </>
  );
}
