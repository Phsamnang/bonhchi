"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "brand";
  size?: "default" | "sm" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:scale-98 select-none";

    const variants: Record<string, string> = {
      default: "bg-[#d9532f] text-white hover:bg-[#b83a19] shadow-xs",
      brand: "bg-[#d9532f] text-white hover:bg-[#b83a19] shadow-xs",
      destructive: "bg-[#cb2431] text-white hover:bg-[#a41d28] shadow-xs",
      outline: "border border-[#e5e4de] bg-white text-[#1f1e1d] hover:bg-[#f5f4ef] hover:border-[#c7c6bf]",
      secondary: "bg-[#f0eee6] text-[#1f1e1d] hover:bg-[#e5e4de]",
      ghost: "hover:bg-[#f0eee6] text-[#6b6a68] hover:text-[#1f1e1d]",
      link: "text-[#d9532f] underline-offset-4 hover:underline p-0 h-auto",
    };

    const sizes: Record<string, string> = {
      default: "h-10 px-4 py-2",
      sm: "h-8 rounded-lg px-3 text-[11px]",
      lg: "h-12 rounded-2xl px-6 text-sm",
      icon: "h-9 w-9 rounded-xl",
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
