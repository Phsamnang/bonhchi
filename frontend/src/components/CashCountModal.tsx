"use client";

import React, { useState } from "react";
import { useSubmitCountMutation, useExpectedCount } from "@/hooks/useCounts";
import BonchiIcon from "./BonchiIcon";
import { formatUsd, formatKhr } from "@/lib/utils";

interface CashCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const DEN: { KHR: number[]; USD: number[] } = {
  KHR: [100000, 50000, 20000, 10000, 5000, 1000, 500],
  USD: [100, 50, 20, 10, 5, 1],
};

export default function CashCountModal({
  isOpen,
  onClose,
  onSuccess,
}: CashCountModalProps) {
  const [cur, setCur] = useState<"KHR" | "USD">("KHR");
  const [counts, setCounts] = useState<{ KHR: Record<number, number>; USD: Record<number, number> }>({
    KHR: {},
    USD: {},
  });
  const [revealed, setRevealed] = useState<{ KHR: boolean; USD: boolean }>({ KHR: false, USD: false });
  const [reason, setReason] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const { data: expectedData } = useExpectedCount();
  const mutation = useSubmitCountMutation();

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const total = (c: "KHR" | "USD") => {
    const curCounts = counts[c];
    return DEN[c].reduce((sum, d) => sum + d * (curCounts[d] || 0), 0);
  };

  const counted = total(cur);
  const system = cur === "USD" ? (expectedData?.expected?.USD ?? 0) : (expectedData?.expected?.KHR ?? 0);
  const tol = cur === "USD" ? (expectedData?.tolerance?.USD ?? 0) : (expectedData?.tolerance?.KHR ?? 0);
  const diff = counted - system;
  const hasGap = Math.abs(diff) > 0;
  const isOverTol = Math.abs(diff) > tol;
  const isRevealed = revealed[cur];

  const fmt = (n: number, c: "KHR" | "USD") => (c === "KHR" ? formatKhr(n) : formatUsd(n));

  const bump = (d: number, k: number) => {
    setCounts((prev) => {
      const copy = { ...prev, [cur]: { ...prev[cur] } };
      const currentVal = copy[cur][d] || 0;
      copy[cur][d] = Math.max(0, currentVal + k);
      return copy;
    });
  };

  const handleSubmit = async () => {
    if (isOverTol && !reason.trim()) {
      setErrorMsg("មានគម្លាតលើសកម្រិតកំណត់ សូមបញ្ជាក់មូលហេតុ!");
      return;
    }

    setErrorMsg("");

    try {
      await mutation.mutateAsync({
        currency: cur,
        denominations: counts[cur] as any,
        reason_for_gap: hasGap ? reason.trim() : undefined,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || "ការរាប់សាច់ប្រាក់បានបរាជ័យ");
    }
  };

  return (
    <>
      <div className="p-scrim" onClick={onClose} aria-label="បិទ Close" />
      <div className="p-sheet p-screen" style={{ maxHeight: "95vh", padding: 0 }} role="dialog" aria-modal="true">
        {/* App Bar */}
        <header className="bc-appbar bc-appbar-back" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: 0 }}>
            <button type="button" onClick={onClose} className="bc-iconbtn" aria-label="ត្រឡប់ Back">
              <BonchiIcon name="back" />
            </button>
            <div className="bc-appbar-t">
              <b>រាប់លុយបិទហាង</b>
              <small>ថតលុយ · Cash drawer · កាបូប 1 នៃ 2</small>
            </div>
          </div>
          <button type="button" onClick={onClose} className="bc-iconbtn" aria-label="បិទ Close">
            <BonchiIcon name="x" size={20} />
          </button>
        </header>

        {/* Scrollable Body */}
        <div className="p-body" style={{ gap: "8px", paddingBottom: "12px" }}>
          {errorMsg && (
            <div className="bc-banner bc-banner-danger" role="alert">
              <BonchiIcon name="alert" size={20} />
              <div className="bc-banner-main">{errorMsg}</div>
            </div>
          )}

          {/* Currency Switcher */}
          <div className="bc-seg bc-seg-full" role="group" aria-label="Currency">
            <button
              type="button"
              aria-pressed={cur === "KHR"}
              onClick={() => setCur("KHR")}
            >
              ៛ រៀល · {fmt(total("KHR"), "KHR")}
            </button>
            <button
              type="button"
              aria-pressed={cur === "USD"}
              onClick={() => setCur("USD")}
            >
              $ ដុល្លារ · {fmt(total("USD"), "USD")}
            </button>
          </div>

          <div className="p-muted" style={{ textAlign: "center" }}>
            ចុច + តាមសន្លឹកក្រដាសប្រាក់ · Tap + for each note
          </div>

          {/* Denominations List */}
          <div className="bc-denoms">
            {DEN[cur].map((d) => {
              const n = counts[cur][d] || 0;
              const sumStr = n ? fmt(d * n, cur) : "—";
              const noteLabel = cur === "KHR" ? `${d.toLocaleString("en-US")} ៛` : `$${d}`;
              const noteCls = `bc-note-${cur}`;

              return (
                <div key={d} className="bc-denom">
                  <span className={`bc-note ${noteCls}`}>{noteLabel}</span>
                  <span className="bc-step">
                    <button type="button" aria-label={`ដក ${noteLabel}`} onClick={() => bump(d, -1)}>
                      −
                    </button>
                    <span>{n}</span>
                    <button type="button" aria-label={`បន្ថែម ${noteLabel}`} onClick={() => bump(d, 1)}>
                      +
                    </button>
                  </span>
                  <span className="bc-denom-sum bc-num">{sumStr}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Foot Result & Confirmation */}
        <div className="p-foot">
          {isRevealed ? (
            <>
              {/* 3-Column Count Result Box */}
              <div className="bc-count">
                <div>
                  <span className="bc-count-l">ប្រព័ន្ធ (System)</span>
                  <span className="bc-count-v">{fmt(system, cur)}</span>
                </div>
                <div>
                  <span className="bc-count-l">រាប់បាន (Counted)</span>
                  <span className="bc-count-v">{fmt(counted, cur)}</span>
                </div>
                <div className={!hasGap ? "bc-count-ok" : isOverTol ? "bc-count-danger" : "bc-count-warning"}>
                  <span className="bc-count-l">គម្លាត (Gap)</span>
                  <span className="bc-count-v">
                    {diff > 0 ? `+${fmt(diff, cur)}` : diff < 0 ? fmt(diff, cur) : "ត្រឹមត្រូវ"}
                  </span>
                </div>
              </div>

              {hasGap && (
                <label className="bc-field">
                  <span className="bc-field-label">
                    មូលហេតុ
                    <small>
                      {isOverTol ? "ត្រូវការ · ម្ចាស់នឹងទទួលដំណឹង" : "Reason for the gap"}
                    </small>
                  </span>
                  <span className="bc-input">
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="ឧ. អាប់លុយខុសម្នាក់"
                      required={isOverTol}
                    />
                  </span>
                </label>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={mutation.isPending}
                className="p-btn"
              >
                <BonchiIcon name="check" size={20} />
                {mutation.isPending ? "កំពុង..." : "បញ្ជាក់ការរាប់"}
              </button>
            </>
          ) : (
            <>
              <div className="p-row" style={{ justifyContent: "space-between" }}>
                <span className="p-label">
                  រាប់បាន<small>Counted</small>
                </span>
                <span className="bc-money bc-money-lg bc-num">{fmt(counted, cur)}</span>
              </div>
              <button
                type="button"
                className="p-btn"
                onClick={() => setRevealed((prev) => ({ ...prev, [cur]: true }))}
              >
                ពិនិត្យជាមួយប្រព័ន្ធ
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
