"use client";

import React from "react";
import BonchiIcon from "./BonchiIcon";
import { formatUsd, formatKhr } from "@/lib/utils";

export interface DualTotalProps {
  title: string;
  usd: number;
  khr: number;
  kind?: "income" | "expense" | "transfer";
  size?: "sm" | "md" | "lg";
}

export function BonchiDualTotal({ title, usd, khr, kind = "income" }: DualTotalProps) {
  const moneyClass =
    kind === "income"
      ? "bc-money bc-money-income"
      : kind === "expense"
      ? "bc-money bc-money-expense"
      : "bc-money bc-money-transfer";

  return (
    <div className="bc-dual">
      <div className="bc-dual-title">{title}</div>
      <div>
        <span className="bc-dual-label">USD</span>
        <span className={`${moneyClass} bc-num`}>{formatUsd(usd)}</span>
      </div>
      <div>
        <span className="bc-dual-label">KHR</span>
        <span className={`${moneyClass} bc-num`}>{formatKhr(khr)}</span>
      </div>
    </div>
  );
}

export interface WalletCardProps {
  name: string;
  sub: string;
  usd: number;
  khr: number;
  category?: "cash" | "bank" | "advance";
  icon?: string;
  tone?: "brand" | "gold" | "income" | "expense";
  onClick?: () => void;
}

export function BonchiWalletCard({
  name,
  sub,
  usd,
  khr,
  category = "cash",
  icon = "wallet",
  tone = "brand",
  onClick,
}: WalletCardProps) {
  const discTone =
    category === "bank" ? "bc-disc-gold" : category === "advance" ? "bc-disc-income" : "bc-disc-brand";

  return (
    <div className="bc-wallet cursor-pointer hover:border-[var(--brand)] transition" onClick={onClick}>
      <div className="bc-wallet-h">
        <span className={`bc-disc ${discTone}`} style={{ width: 32, height: 32 }}>
          <BonchiIcon name={icon} size={18} />
        </span>
        <b className="truncate">{name}</b>
        <small className="truncate">{sub}</small>
      </div>
      <div className="bc-wallet-row">
        <span className="bc-cur bc-cur-USD">USD</span>
        <span className="bc-money bc-num">{formatUsd(usd)}</span>
      </div>
      <div className="bc-wallet-row">
        <span className="bc-cur bc-cur-KHR">KHR</span>
        <span className="bc-money bc-num">{formatKhr(khr)}</span>
      </div>
    </div>
  );
}

export interface TransactionRowProps {
  title: string;
  meta: string;
  kind?: "income" | "expense" | "transfer";
  icon?: string;
  usd?: number;
  khr?: number;
  status?: string;
  onClick?: () => void;
}

export function BonchiTransactionRow({
  title,
  meta,
  kind = "expense",
  icon = "cart",
  usd = 0,
  khr = 0,
  status = "paid",
  onClick,
}: TransactionRowProps) {
  const discClass =
    kind === "income"
      ? "bc-disc-income"
      : kind === "transfer"
      ? "bc-disc-transfer"
      : "bc-disc-expense";

  const moneyClass =
    kind === "income"
      ? "bc-money bc-money-income"
      : kind === "transfer"
      ? "bc-money bc-money-transfer"
      : "bc-money bc-money-expense";

  const prefix = kind === "expense" ? "-" : kind === "income" ? "+" : "";

  return (
    <div
      onClick={onClick}
      className={`bc-row cursor-pointer hover:bg-[var(--surface-sunken)] px-2 rounded-xl transition ${
        status === "void" ? "p-void" : ""
      }`}
    >
      <span className={`bc-disc ${discClass}`}>
        <BonchiIcon name={icon} size={20} />
      </span>
      <div className="bc-row-main">
        <div className="bc-row-t">{title}</div>
        <div className="bc-row-m">{meta}</div>
      </div>
      <div className="bc-row-amts">
        {usd > 0 && (
          <span className={`${moneyClass} bc-num`}>
            {prefix}
            {formatUsd(usd)}
          </span>
        )}
        {khr > 0 && (
          <span className={`${moneyClass} bc-num`}>
            {prefix}
            {formatKhr(khr)}
          </span>
        )}
        {usd === 0 && khr === 0 && (
          <span className="bc-money bc-money-zero">$0.00</span>
        )}
      </div>
    </div>
  );
}
