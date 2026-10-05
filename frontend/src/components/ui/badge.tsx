"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "cash" | "bank" | "success" | "warning";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants: Record<string, string> = {
    default: "bg-[#f0eee6] text-[#1f1e1d] border-[#e5e4de]",
    secondary: "bg-[#f5f4ef] text-[#6b6a68] border-transparent",
    destructive: "bg-[#ffeef0] text-[#cb2431] border-[#cb2431]/20",
    outline: "text-[#1f1e1d] border-[#e5e4de]",
    cash: "bg-[#eaf5ea] text-[#22863a] border-[#22863a]/30",
    bank: "bg-[#edf4fc] text-[#0366d6] border-[#0366d6]/30",
    success: "bg-[#dcffe4] text-[#22863a] border-[#22863a]/20",
    warning: "bg-[#fff8c5] text-[#b08800] border-[#b08800]/30",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold transition-colors select-none",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
