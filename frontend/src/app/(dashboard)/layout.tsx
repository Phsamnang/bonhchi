"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import BonchiIcon from "@/components/BonchiIcon";
import SmallExpenseModal from "@/components/SmallExpenseModal";
import TransferModal from "@/components/TransferModal";
import CashCountModal from "@/components/CashCountModal";
import MarketTripModal from "@/components/MarketTripModal";
import TransactionDetailModal from "@/components/TransactionDetailModal";
import AddSheetModal from "@/components/AddSheetModal";
import { DashboardProvider, useDashboardContext } from "./DashboardContext";

/* ─── Page metadata map ─────────────────────────────── */

const pageMeta: Record<string, { title: string; sub: string }> = {
  "/": { title: "ផ្ទាំងគ្រប់គ្រង", sub: "" },
  "/wallets": { title: "កាបូប & គណនី", sub: "សមតុល្យសាច់ប្រាក់ និងធនាគារទាំងអស់" },
  "/requests": { title: "ស្នើសុំលុយមុន", sub: "ការទូទាត់ និងសំណើសាច់ប្រាក់អ្នកគ្រប់គ្រង" },
  "/count": { title: "រាប់លុយបិទហាង", sub: "ផ្ទៀងផ្ទាត់សាច់ប្រាក់ថតលុយប្រចាំថ្ងៃ" },
  "/reports": { title: "របាយការណ៍ហិរញ្ញវត្ថុ", sub: "ទិន្នន័យចំណូល ចំណាយ និងសន្និធិ" },
  "/suppliers": { title: "អ្នកផ្គត់ផ្គង់ & ទំនិញ", sub: "បញ្ជីហាងផ្គត់ផ្គង់ និងមុខទំនិញតាមហាងនីមួយៗ" },
  "/settings": { title: "ការកំណត់ប្រព័ន្ធ", sub: "អ្នកផ្គត់ផ្គង់ និងទំនិញ Master Data" },
};

/* ─── Nav items (sidebar + bottomnav) ────────────────── */

const sideNavItems = [
  { href: "/", label: "ទំព័រដើម", icon: "home" },
  { href: "/wallets", label: "កាបូប", icon: "wallet" },
  { href: "/requests", label: "ស្នើសុំលុយ", icon: "request" },
  { href: "/suppliers", label: "អ្នកផ្គត់ផ្គង់", icon: "cart" },
  { href: "/count", label: "រាប់លុយបិទវេន", icon: "count", hasBadge: true },
  { href: "/reports", label: "របាយការណ៍", icon: "chart" },
  { href: "/settings", label: "ការកំណត់", icon: "wrench" },
];

const bottomNavItems = [
  { href: "/", label: "ទំព័រដើម", icon: "home" },
  { href: "/wallets", label: "កាបូប", icon: "wallet" },
  { href: "__add__", label: "បន្ថែម", icon: "plus" }, // Special: opens add sheet
  { href: "/reports", label: "របាយការណ៍", icon: "chart" },
  { href: "/settings", label: "ខ្ញុំ", icon: "user" },
];

/* ─── Inner Shell (needs context) ────────────────────── */

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const ctx = useDashboardContext();

  const meta = pageMeta[pathname] || pageMeta["/"];
  // Dynamic subtitle for home
  const homeSub = ctx.dashboard?.date_km
    ? `${ctx.dashboard.date_km} · ${ctx.roleLabel}`
    : ctx.roleLabel;
  const title = meta.title;
  const sub = pathname === "/" ? homeSub : meta.sub;

  const isHome = pathname === "/";

  return (
    <div className="bc w-shell t-light">
      {/* Toast */}
      {ctx.toastText && (
        <div className="p-toast fixed top-4 right-4 z-50 animate-in fade-in" role="status">
          <BonchiIcon name="check" size={18} />
          {ctx.toastText}
        </div>
      )}

      {/* ─── Desktop Sidebar ─── */}
      <aside className="w-side" aria-label="Main menu">
        <div className="w-brand">
          <div className="w-logo">🍛</div>
          <div>
            <div style={{ font: "700 17px/24px var(--font-sans)" }}>Bonchi</div>
            <div className="p-muted" style={{ fontSize: "12px", lineHeight: "18px" }}>
              ភោជនីយដ្ឋាន ការីជប៉ុន
            </div>
          </div>
        </div>

        {/* New transaction dropdown */}
        <div className="w-rel">
          <button
            type="button"
            className="p-btn"
            onClick={() => ctx.setNewMenu(!ctx.newMenu)}
            style={{ minHeight: "48px" }}
          >
            <BonchiIcon name="plus" size={20} />
            កត់ត្រាថ្មី
          </button>

          {ctx.newMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => ctx.setNewMenu(false)} />
              <div className="w-newmenu" role="menu">
                <button
                  type="button"
                  className="w-menuitem"
                  onClick={() => {
                    ctx.setNewMenu(false);
                    ctx.openMarketTrip();
                  }}
                >
                  <span className="bc-disc bc-disc-expense" style={{ width: 36, height: 36 }}>
                    <BonchiIcon name="cart" size={20} />
                  </span>
                  <span>
                    ទិញទំនិញ
                    <small>Product purchase · ដើរផ្សារ</small>
                  </span>
                </button>

                <button
                  type="button"
                  className="w-menuitem"
                  onClick={() => {
                    ctx.setNewMenu(false);
                    ctx.setIsSmallExpenseOpen(true);
                  }}
                >
                  <span className="bc-disc bc-disc-expense" style={{ width: 36, height: 36 }}>
                    <BonchiIcon name="coins" size={20} />
                  </span>
                  <span>
                    ចំណាយតូចតាច
                    <small>Small expense · ទឹកកក ហ្គាស</small>
                  </span>
                </button>

                <button
                  type="button"
                  className="w-menuitem"
                  onClick={() => {
                    ctx.setNewMenu(false);
                    ctx.setIsTransferOpen(true);
                  }}
                >
                  <span className="bc-disc bc-disc-transfer" style={{ width: 36, height: 36 }}>
                    <BonchiIcon name="transfer" size={20} />
                  </span>
                  <span>
                    ផ្ទេរប្រាក់
                    <small>Transfer · រវាងកាបូប</small>
                  </span>
                </button>

                <button
                  type="button"
                  className="w-menuitem"
                  onClick={() => {
                    ctx.setNewMenu(false);
                    router.push("/requests");
                  }}
                >
                  <span className="bc-disc bc-disc-gold" style={{ width: 36, height: 36 }}>
                    <BonchiIcon name="request" size={20} />
                  </span>
                  <span>
                    ស្នើសុំលុយ
                    <small>Request money · អ្នកគ្រប់គ្រង</small>
                  </span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Nav items */}
        <nav className="w-nav">
          {sideNavItems.map((n) => {
            const isActive = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`w-navbtn ${isActive ? "w-navbtn-on" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <BonchiIcon name={n.icon} size={22} />
                {n.label}
                {n.hasBadge && ctx.dashboard && !ctx.dashboard.closing_count_completed && (
                  <span className="w-count">!</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="w-user">
          <div className="w-avatar">
            {ctx.session?.user?.name ? ctx.session.user.name.charAt(0) : "B"}
          </div>
          <div className="p-grow">
            <div style={{ font: "600 14px/22px var(--font-sans)" }}>
              {ctx.session?.user?.name || "អ្នកប្រើប្រាស់"}
            </div>
            <div className="p-muted" style={{ fontSize: "12px", lineHeight: "18px" }}>
              {ctx.roleLabel} · @{ctx.session?.user?.username || "—"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (confirm("តើអ្នកចង់ចាកចេញពីប្រព័ន្ធមែនទេ? (Log out?)")) ctx.logout();
            }}
            className="text-[11px] bg-[var(--surface-raised)] border border-[var(--line)] px-2 py-1 rounded font-bold cursor-pointer hover:bg-[var(--line)]"
            style={{ color: "var(--expense)" }}
            title="ចាកចេញ (Log out)"
          >
            ចាកចេញ
          </button>
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <main className="w-main">
        {/* Topbar */}
        <header className="w-top">
          {!isHome && (
            <button
              type="button"
              className="bc-iconbtn"
              aria-label="ត្រឡប់ Back"
              onClick={() => router.push("/")}
            >
              <BonchiIcon name="back" />
            </button>
          )}

          <div className="p-grow">
            <h1>{title}</h1>
            <small>{sub}</small>
          </div>

          <button
            type="button"
            onClick={ctx.handleRefreshAll}
            className="bc-iconbtn"
            title="ទាញទិន្នន័យថ្មី (Refresh)"
          >
            <BonchiIcon name="search" size={18} />
          </button>

          <label className="w-search">
            <BonchiIcon name="search" size={18} />
            <input placeholder="ស្វែងរកប្រតិបត្តិការ ឬ ទំនិញ..." />
          </label>
        </header>

        {/* Page Content */}
        <div className="w-content">{children}</div>
      </main>

      {/* ─── Mobile Bottom Navigation ─── */}
      <nav className="w-bottomnav bc-nav" aria-label="Mobile Navigation">
        {bottomNavItems.map((n) => {
          if (n.href === "__add__") {
            return (
              <button
                key="add"
                type="button"
                className="p-plus"
                aria-label="បន្ថែម Add"
                onClick={() => ctx.setIsAddSheetOpen(true)}
              >
                <BonchiIcon name="plus" size={28} strokeWidth={2.4} />
              </button>
            );
          }
          const isActive = pathname === n.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`p-navlink ${isActive ? "p-navlink-on" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <BonchiIcon name={n.icon} />
              {n.label}
            </Link>
          );
        })}
      </nav>

      {/* ─── Modals (shared across all pages) ─── */}
      <AddSheetModal
        isOpen={ctx.isAddSheetOpen}
        onClose={() => ctx.setIsAddSheetOpen(false)}
        onSelectAction={(action) => {
          if (action === "market") ctx.openMarketTrip();
          else if (action === "small") ctx.setIsSmallExpenseOpen(true);
          else if (action === "transfer") ctx.setIsTransferOpen(true);
          else if (action === "request") router.push("/requests");
        }}
      />

      <MarketTripModal
        isOpen={ctx.isMarketTripOpen}
        initialSupplier={ctx.marketTripSupplier}
        onClose={() => ctx.setIsMarketTripOpen(false)}
        onSuccess={() => {
          ctx.showToast("បានរក្សាទុកការទិញដោយជោគជ័យ!");
          ctx.handleRefreshAll();
        }}
        wallets={ctx.wallets}
      />

      <SmallExpenseModal
        isOpen={ctx.isSmallExpenseOpen}
        onClose={() => ctx.setIsSmallExpenseOpen(false)}
        onSuccess={() => {
          ctx.showToast("បានកត់ត្រាចំណាយតូចតាចរួចរាល់!");
          ctx.handleRefreshAll();
        }}
        wallets={ctx.wallets}
      />

      <TransferModal
        isOpen={ctx.isTransferOpen}
        onClose={() => ctx.setIsTransferOpen(false)}
        onSuccess={() => {
          ctx.showToast("បានអនុវត្តការផ្ទេរប្រាក់រួចរាល់!");
          ctx.handleRefreshAll();
        }}
        wallets={ctx.wallets}
      />

      {pathname !== "/count" && (
        <CashCountModal
          isOpen={ctx.isCashCountOpen}
          onClose={() => ctx.setIsCashCountOpen(false)}
          onSuccess={() => {
            ctx.showToast("បានបញ្ជាក់ការរាប់សាច់ប្រាក់រួចរាល់!");
            ctx.handleRefreshAll();
          }}
        />
      )}

      <TransactionDetailModal
        isOpen={!!ctx.selectedInvoice}
        onClose={() => ctx.setSelectedInvoice(null)}
        invoice={ctx.selectedInvoice}
        role={ctx.role}
        onSuccess={() => {
          ctx.showToast("បានធ្វើបច្ចុប្បន្នភាពវិក្កយបត្រ!");
          ctx.handleRefreshAll();
        }}
      />
    </div>
  );
}

/* ─── Exported Layout ────────────────────────────────── */

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardProvider>
      <DashboardShell>{children}</DashboardShell>
    </DashboardProvider>
  );
}
