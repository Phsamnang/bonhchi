"use client";

import React from "react";
import BonchiIcon from "@/components/BonchiIcon";
import { formatUsd, formatKhr } from "@/lib/utils";
import { useDashboardContext } from "../DashboardContext";

export default function SettingsPage() {
  const ctx = useDashboardContext();
  const masterShops = ctx.masterShops || [];
  const masterProducts = ctx.masterProducts || [];

  return (
    <>
      {/* Account: who is signed in + log out (main logout entry on mobile) */}
      <section className="w-panel" style={{ marginBottom: "16px" }}>
        <div className="p-row" style={{ gap: "12px" }}>
          <div className="w-avatar">{ctx.session?.user?.name ? ctx.session.user.name.charAt(0) : "B"}</div>
          <span className="p-grow">
            <b style={{ display: "block" }}>{ctx.session?.user?.name || "អ្នកប្រើប្រាស់"}</b>
            <span className="p-muted" style={{ fontSize: "13px" }}>
              {ctx.roleLabel} · @{ctx.session?.user?.username || "—"}
            </span>
          </span>
          <button
            type="button"
            className="bc-btn bc-btn-secondary"
            style={{ minHeight: "40px", color: "var(--expense)" }}
            onClick={() => {
              if (confirm("តើអ្នកចង់ចាកចេញពីប្រព័ន្ធមែនទេ? (Log out?)")) ctx.logout();
            }}
          >
            ចាកចេញ (Log out)
          </button>
        </div>
      </section>

    <div className="w-two">
      <section className="w-panel">
        <h2>
          អ្នកផ្គត់ផ្គង់ & ហាង <small>Suppliers ({masterShops.length})</small>
        </h2>
        {masterShops.map((sh) => (
          <div
            key={sh.id}
            className="p-row"
            style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}
          >
            <span className="bc-disc bc-disc-expense">
              <BonchiIcon name="cart" size={20} />
            </span>
            <span className="p-grow">
              <b style={{ display: "block" }}>{sh.name}</b>
              <span className="p-muted">{sh.market_location || "ហាងផ្សារ"}</span>
            </span>
          </div>
        ))}
      </section>

      <section className="w-panel">
        <h2>
          ទំនិញក្នុងប្រព័ន្ធ <small>Products Catalog ({masterProducts.length})</small>
        </h2>
        {masterProducts.map((pr) => (
          <div
            key={pr.id}
            className="p-row"
            style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}
          >
            <span className="bc-disc bc-disc-brand">
              <BonchiIcon name="leaf" size={20} />
            </span>
            <span className="p-grow">
              <b style={{ display: "block" }}>{pr.name}</b>
              <span className="p-muted">1 {pr.unit}</span>
            </span>
            <span className="font-bold">
              {pr.cur === "USD" ? formatUsd(pr.price) : formatKhr(pr.price)}
            </span>
          </div>
        ))}
      </section>
    </div>
    </>
  );
}
