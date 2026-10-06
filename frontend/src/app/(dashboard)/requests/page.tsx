"use client";

import React, { useState } from "react";
import BonchiIcon from "@/components/BonchiIcon";
import { formatUsd, formatKhr } from "@/lib/utils";
import { useDashboardContext } from "../DashboardContext";

export default function RequestsPage() {
  const {
    requests,
    reqTab,
    setReqTab,
    isOwner,
    setIsTransferOpen,
    approveReqMutation,
    rejectReqMutation,
    showToast,
  } = useDashboardContext();

  const [selectedReqId, setSelectedReqId] = useState<string | number | null>(null);

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
        {(["all", "pending", "approved", "settled", "rejected"] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`p-chip ${reqTab === t ? "p-chip-on" : ""}`}
            aria-pressed={reqTab === t}
            onClick={() => setReqTab(t)}
          >
            {t === "all" ? "ទាំងអស់" : t.toUpperCase()}
          </button>
        ))}
        <span className="p-grow" />
        <button
          type="button"
          className="bc-btn bc-btn-primary"
          onClick={() => setIsTransferOpen(true)}
          style={{ minHeight: "40px" }}
        >
          <BonchiIcon name="plus" size={18} />
          ស្នើសុំលុយ
        </button>
      </div>

      <div className="w-two">
        <section className="w-panel" style={{ gap: 0 }}>
          {requests.length > 0 ? (
            requests.map((r) => (
              <button
                key={r.id}
                type="button"
                className="w-tx"
                onClick={() => setSelectedReqId(r.id)}
                style={{
                  gridTemplateColumns: "40px minmax(0, 1fr) auto",
                  background: selectedReqId === r.id ? "var(--brand-soft)" : "transparent",
                }}
              >
                <span className="bc-disc bc-disc-gold">
                  <BonchiIcon name="request" size={20} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span className="bc-row-t" style={{ display: "block" }}>
                    {r.category_name || "ចំណាយ"} ·{" "}
                    {r.currency === "USD" ? formatUsd(r.amount) : formatKhr(r.amount)}
                  </span>
                  <span className="bc-row-m" style={{ display: "block" }}>
                    #{r.id} · {r.requested_by_name} · {r.created_at?.split("T")[0]}
                  </span>
                </span>
                <span
                  className={`bc-badge ${
                    r.status === "approved"
                      ? "bc-badge-success"
                      : r.status === "rejected"
                      ? "bc-badge-danger"
                      : "bc-badge-warning"
                  }`}
                >
                  {(r.status || "").toUpperCase()}
                </span>
              </button>
            ))
          ) : (
            <div className="p-muted" style={{ padding: "24px 0", textAlign: "center" }}>
              គ្មានសំណើក្នុងបញ្ជីនេះទេ
            </div>
          )}
        </section>

        <section className="w-panel">
          <h2>
            ព័ត៌មានសំណើ <small>Request details</small>
          </h2>
          {selectedReqId ? (
            (() => {
              const req = requests.find((r) => r.id === selectedReqId);
              if (!req) return null;
              return (
                <div className="space-y-4">
                  <div className="p-kv">
                    <span>ចំនួនទឹកប្រាក់:</span>
                    <b className="bc-num text-lg">
                      {req.currency === "USD" ? formatUsd(req.amount) : formatKhr(req.amount)}
                    </b>
                  </div>
                  <div className="p-kv">
                    <span>ស្នើសុំដោយ:</span>
                    <b>{req.requested_by_name}</b>
                  </div>
                  <div className="p-kv">
                    <span>មូលហេតុ:</span>
                    <span>{req.reason}</span>
                  </div>

                  {isOwner && req.status === "pending" && (
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        className="bc-btn bc-btn-primary flex-1"
                        onClick={async () => {
                          await approveReqMutation.mutateAsync({
                            id: req.id,
                            from_wallet: "petty",
                          });
                          showToast("បានអនុម័តសំណើដោយជោគជ័យ");
                        }}
                      >
                        អនុម័ត (Approve)
                      </button>
                      <button
                        type="button"
                        className="bc-btn bc-btn-danger flex-1"
                        onClick={async () => {
                          await rejectReqMutation.mutateAsync({
                            id: req.id,
                            reason: "បដិសេធដោយម្ចាស់",
                          });
                          showToast("បានបដិសេធសំណើ");
                        }}
                      >
                        បដិសេធ
                      </button>
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            <div className="p-muted" style={{ padding: "16px 0" }}>
              សូមជ្រើorg សំណើមួយពីខាងឆ្វេងដើម្បីមើលព័ត៌មានលម្អិត
            </div>
          )}
        </section>
      </div>
    </>
  );
}
