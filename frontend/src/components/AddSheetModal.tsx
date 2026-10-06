"use client";

import React from "react";
import BonchiIcon from "./BonchiIcon";

interface AddSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: "market" | "small" | "income" | "transfer" | "request") => void;
  lastTxHint?: string;
}

export default function AddSheetModal({
  isOpen,
  onClose,
  onSelectAction,
  lastTxHint,
}: AddSheetModalProps) {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Dimmed Backdrop */}
      <div className="p-scrim" onClick={onClose} aria-label="បិទ Close" />

      {/* Slide-up Bottom Sheet */}
      <div className="p-sheet animate-in slide-in-from-bottom duration-200" role="dialog" aria-modal="true" aria-label="តើអ្នកចង់កត់អ្វី?">
        <div className="p-grab" />

        <div className="p-row">
          <div className="p-grow">
            <div style={{ fontSize: "20px", lineHeight: "32px", fontWeight: 600 }}>កត់ត្រាថ្មី</div>
            <div className="p-muted">What do you want to record?</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bc-iconbtn"
            aria-label="បិទ Close"
          >
            <BonchiIcon name="x" size={20} />
          </button>
        </div>

        {/* 2x2 Category Tiles Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" }}>
          <button
            type="button"
            className="bc-tile"
            onClick={() => {
              onClose();
              onSelectAction("market");
            }}
          >
            <span className="bc-disc bc-disc-expense">
              <BonchiIcon name="cart" size={20} />
            </span>
            <span>
              <span className="bc-tile-t" style={{ display: "block" }}>ទិញទំនិញ</span>
              <span className="bc-tile-s" style={{ display: "block" }}>Product purchase</span>
            </span>
          </button>

          <button
            type="button"
            className="bc-tile"
            onClick={() => {
              onClose();
              onSelectAction("small");
            }}
          >
            <span className="bc-disc bc-disc-expense">
              <BonchiIcon name="coins" size={20} />
            </span>
            <span>
              <span className="bc-tile-t" style={{ display: "block" }}>ចំណាយតូចតាច</span>
              <span className="bc-tile-s" style={{ display: "block" }}>Small expense</span>
            </span>
          </button>

          <button
            type="button"
            className="bc-tile"
            onClick={() => {
              onClose();
              onSelectAction("income");
            }}
          >
            <span className="bc-disc bc-disc-income">
              <BonchiIcon name="income" size={20} />
            </span>
            <span>
              <span className="bc-tile-t" style={{ display: "block" }}>ចំណូល</span>
              <span className="bc-tile-s" style={{ display: "block" }}>Income</span>
            </span>
          </button>

          <button
            type="button"
            className="bc-tile"
            onClick={() => {
              onClose();
              onSelectAction("transfer");
            }}
          >
            <span className="bc-disc bc-disc-transfer">
              <BonchiIcon name="transfer" size={20} />
            </span>
            <span>
              <span className="bc-tile-t" style={{ display: "block" }}>ផ្ទេរប្រាក់</span>
              <span className="bc-tile-s" style={{ display: "block" }}>Transfer</span>
            </span>
          </button>
        </div>

        {/* Request Advance Tile */}
        <button
          type="button"
          className="bc-tile"
          onClick={() => {
            onClose();
            onSelectAction("request");
          }}
          style={{ flexDirection: "row", alignItems: "center", minHeight: "64px" }}
        >
          <span className="bc-disc bc-disc-gold">
            <BonchiIcon name="request" size={20} />
          </span>
          <span className="p-grow">
            <span className="bc-tile-t" style={{ display: "block" }}>ស្នើសុំលុយ</span>
            <span className="bc-tile-s" style={{ display: "block" }}>Request money · អ្នកគ្រប់គ្រង</span>
          </span>
          <BonchiIcon name="chevron" size={20} />
        </button>

        {lastTxHint && (
          <div className="p-muted" style={{ textAlign: "center" }}>
            {lastTxHint}
          </div>
        )}
      </div>
    </>
  );
}
