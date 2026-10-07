"use client";

import React, { useState, useEffect } from "react";
import BonchiIcon from "@/components/BonchiIcon";
import { Staff, useCreateStaff, useUpdateStaff } from "@/hooks/usePayroll";

interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffToEdit?: Staff | null;
  onSuccess?: () => void;
}

export default function StaffModal({ isOpen, onClose, staffToEdit, onSuccess }: StaffModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("មេចុងភៅ (Cook)");
  const [joinedDate, setJoinedDate] = useState(new Date().toISOString().slice(0, 10));
  const [salaryType, setSalaryType] = useState<"monthly" | "daily">("monthly");
  const [baseRate, setBaseRate] = useState<string>("300");
  const [currency, setCurrency] = useState<"USD" | "KHR">("USD");
  const [standardDays, setStandardDays] = useState<number>(26);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState("");

  const createMutation = useCreateStaff();
  const updateMutation = useUpdateStaff();

  useEffect(() => {
    if (staffToEdit) {
      setName(staffToEdit.name || "");
      setPhone(staffToEdit.phone || "");
      setPosition(staffToEdit.position || "");
      setJoinedDate(staffToEdit.joined_date || new Date().toISOString().slice(0, 10));
      setSalaryType(staffToEdit.salary_type || "monthly");
      setBaseRate(staffToEdit.base_rate !== null ? String(staffToEdit.base_rate) : "300");
      setCurrency(staffToEdit.currency || "USD");
      setStandardDays(staffToEdit.standard_days || 26);
      setIsActive(staffToEdit.is_active);
    } else {
      setName("");
      setPhone("");
      setPosition("មេចុងភៅ (Cook)");
      setJoinedDate(new Date().toISOString().slice(0, 10));
      setSalaryType("monthly");
      setBaseRate("300");
      setCurrency("USD");
      setStandardDays(26);
      setIsActive(true);
    }
    setErrorMsg("");
  }, [staffToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("សូមបញ្ចូលឈ្មោះបុគ្គលិក");
      return;
    }
    const rateNum = Number(baseRate);
    if (isNaN(rateNum) || rateNum <= 0) {
      setErrorMsg("សូមបញ្ចូលប្រាក់ខែគោលត្រឹមត្រូវ (> 0)");
      return;
    }

    try {
      if (staffToEdit) {
        await updateMutation.mutateAsync({
          id: staffToEdit.id,
          name: name.trim(),
          phone: phone.trim() || null,
          position: position.trim(),
          joined_date: joinedDate,
          is_active: isActive,
          salary_type: salaryType,
          base_rate: rateNum,
          currency,
          standard_days: standardDays,
        });
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          phone: phone.trim() || null,
          position: position.trim(),
          joined_date: joinedDate,
          salary_type: salaryType,
          base_rate: rateNum,
          currency,
          standard_days: standardDays,
        });
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "បរាជ័យក្នុងការរក្សាទុកទិន្នន័យ");
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <div className="p-scrim" onClick={onClose} aria-label="បិទ Close" />
      <div
        className="p-sheet p-screen"
        style={{ maxHeight: "92vh", maxWidth: "540px", margin: "auto", padding: 0 }}
        role="dialog"
        aria-modal="true"
      >
        <header className="bc-appbar bc-appbar-back" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button type="button" onClick={onClose} className="bc-iconbtn" aria-label="Back">
              <BonchiIcon name="back" />
            </button>
            <div className="bc-appbar-t">
              <b>{staffToEdit ? "កែប្រែព័ត៌មានបុគ្គលិក" : "បន្ថែមបុគ្គលិកថ្មី"}</b>
              <small>{staffToEdit ? "Edit Staff & Terms" : "Add Staff Member"}</small>
            </div>
          </div>
          <button type="button" onClick={onClose} className="bc-iconbtn" aria-label="Close">
            <BonchiIcon name="x" size={20} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-body" style={{ gap: "16px", padding: "16px", overflowY: "auto" }}>
          {errorMsg && (
            <div className="bc-banner bc-banner-danger" role="alert">
              <BonchiIcon name="alert" size={20} />
              <div className="bc-banner-main">{errorMsg}</div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "13px", fontWeight: "600" }}>ឈ្មោះបុគ្គលិក *</label>
            <input
              type="text"
              className="bc-input"
              placeholder="ឧ. សុខ ចាន់ថន"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600" }}>តួនាទី / មុខតំណែង *</label>
              <input
                type="text"
                className="bc-input"
                placeholder="ឧ. មេចុងភៅ, សេវាកម្ម..."
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                required
              />
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                {[
                  "មេចុងភៅ",
                  "ជំនួយការចុងភៅ",
                  "សេវាកម្ម",
                  "អ្នកគិតលុយ",
                  "លាងចាន / អនាម័យ",
                  "អ្នកគ្រប់គ្រង",
                ].map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setPosition(pos)}
                    style={{
                      fontSize: "11px",
                      padding: "2px 7px",
                      borderRadius: "6px",
                      border: "1px solid #e0deda",
                      background: position.includes(pos) ? "#e8f5e9" : "#fbf9f6",
                      color: position.includes(pos) ? "#1b5e20" : "#555",
                      cursor: "pointer",
                      fontWeight: position.includes(pos) ? 700 : 500,
                    }}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600" }}>លេខទូរស័ព្ទ</label>
              <input
                type="tel"
                className="bc-input"
                placeholder="012 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600" }}>ថ្ងៃចូលធ្វើការ</label>
              <input
                type="date"
                className="bc-input"
                value={joinedDate}
                onChange={(e) => setJoinedDate(e.target.value)}
                required
              />
            </div>
            {staffToEdit && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: "600" }}>ស្ថានភាព</label>
                <select
                  className="bc-input"
                  value={isActive ? "active" : "inactive"}
                  onChange={(e) => setIsActive(e.target.value === "active")}
                >
                  <option value="active">កំពុងបម្រើការ (Active)</option>
                  <option value="inactive">ឈប់សម្រាក (Inactive)</option>
                </select>
              </div>
            )}
          </div>

          <hr style={{ border: "none", borderTop: "1px solid var(--border-subtle, #eee)", margin: "4px 0" }} />

          <div>
            <div style={{ fontSize: "14px", fontWeight: "700", marginBottom: "8px", color: "var(--brand-primary, #b34a1e)" }}>
              លក្ខខណ្ឌប្រាក់ខែ & កិច្ចសន្យា
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: "600" }}>ប្រភេទប្រាក់ខែ</label>
                <select
                  className="bc-input"
                  value={salaryType}
                  onChange={(e) => setSalaryType(e.target.value as "monthly" | "daily")}
                >
                  <option value="monthly">ប្រចាំខែ (Monthly)</option>
                  <option value="daily">ប្រចាំថ្ងៃ (Daily)</option>
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: "600" }}>រូបិយប័ណ្ណ</label>
                <select
                  className="bc-input"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as "USD" | "KHR")}
                >
                  <option value="USD">USD ($)</option>
                  <option value="KHR">KHR (៛)</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: "600" }}>
                  {salaryType === "monthly" ? "ប្រាក់ខែគោល (Base Rate)" : "ប្រាក់ឈ្នួលក្នុង ១ ថ្ងៃ"} *
                </label>
                <input
                  type="number"
                  step="any"
                  className="bc-input"
                  placeholder={currency === "USD" ? "300" : "1200000"}
                  value={baseRate}
                  onChange={(e) => setBaseRate(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: "600" }}>ចំនួនថ្ងៃស្តង់ដារក្នុងខែ</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  className="bc-input"
                  value={standardDays}
                  onChange={(e) => setStandardDays(Number(e.target.value) || 26)}
                  required
                />
                <span style={{ fontSize: "11px", color: "#666" }}>
                  {salaryType === "monthly" ? `គិតជាមធ្យម 1 ថ្ងៃ = ${(Number(baseRate) / (standardDays || 26)).toFixed(2)} ${currency}` : "ប្រាក់ឈ្នួលគិតតាមថ្ងៃផ្ទាល់"}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <button
              type="button"
              className="bc-btn bc-btn-secondary"
              onClick={onClose}
              style={{ flex: 1, minHeight: "44px" }}
              disabled={isSubmitting}
            >
              បោះបង់
            </button>
            <button
              type="submit"
              className="bc-btn bc-btn-primary"
              style={{ flex: 2, minHeight: "44px" }}
              disabled={isSubmitting}
            >
              {isSubmitting ? "កំពុងរក្សាទុក..." : staffToEdit ? "ធ្វើបច្ចុប្បន្នភាព" : "បង្កើតបុគ្គលិក"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
