"use client";

import React from "react";

interface BonchiLogoMarkProps {
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export function BonchiLogoMark({
  size = 40,
  className = "",
  style,
}: BonchiLogoMarkProps) {
  const sz = typeof size === "number" ? `${size}px` : size;

  return (
    <svg
      width={sz}
      height={sz}
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={className}
      style={{ display: "block", flexShrink: 0, ...style }}
    >
      {/* Main icon background */}
      <rect x="5" y="5" width="90" height="90" rx="24" fill="#075E4D" />
      {/* Khmer character 'ប' (Kantumruy Pro Bold outline) */}
      <path
        d="M321 -10Q206 -10 141.0 39.5Q76 89 76 180V368Q76 394 67.5 406.5Q59 419 44 425V498Q44 551 70.0 578.5Q96 606 147 606H252V478H204Q186 478 186 458V448Q218 436 232.0 417.5Q246 399 246 364V180Q246 147 266.5 128.5Q287 110 321 110Q356 110 376.0 128.5Q396 147 396 180V368Q396 394 387.5 406.5Q379 419 364 425V498Q364 551 390.0 578.5Q416 606 467 606H572V478H524Q506 478 506 458V448Q538 436 552.0 417.5Q566 399 566 364V180Q566 89 501.5 39.5Q437 -10 321 -10Z"
        fill="#FFFFFF"
        transform="translate(31.382, 72) scale(0.058, -0.058)"
      />
      {/* Accent dot */}
      <circle cx="76" cy="24" r="8" fill="#E5AA2B" />
    </svg>
  );
}

interface BonchiLogoProps {
  /** Size scale: 'sm' (for sidebars/compact headers), 'md' (standard), 'lg' (welcome/login) */
  size?: "sm" | "md" | "lg" | number;
  layout?: "horizontal" | "vertical";
  showSubtitle?: boolean;
  subtitle?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function BonchiLogo({
  size = "md",
  layout = "horizontal",
  showSubtitle = true,
  subtitle = "បញ្ជី · ចំណូល · ចំណាយ",
  className = "",
  style,
}: BonchiLogoProps) {
  // Config dimensions based on size
  let markSize = 48;
  let titleFontSize = "26px";
  let titleLineHeight = "32px";
  let subFontSize = "13px";
  let subLineHeight = "20px";
  let gap = "12px";

  if (typeof size === "number") {
    markSize = size;
    const ratio = size / 64;
    titleFontSize = `${Math.round(36 * ratio)}px`;
    titleLineHeight = `${Math.round(40 * ratio)}px`;
    subFontSize = `${Math.max(11, Math.round(15 * ratio))}px`;
    subLineHeight = `${Math.max(16, Math.round(24 * ratio))}px`;
    gap = `${Math.round(14 * ratio)}px`;
  } else if (size === "sm") {
    markSize = 38;
    titleFontSize = "19px";
    titleLineHeight = "24px";
    subFontSize = "12px";
    subLineHeight = "17px";
    gap = "10px";
  } else if (size === "lg") {
    markSize = 64;
    titleFontSize = "36px";
    titleLineHeight = "40px";
    subFontSize = "15px";
    subLineHeight = "24px";
    gap = "14px";
  }

  const isVertical = layout === "vertical";

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        flexDirection: isVertical ? "column" : "row",
        alignItems: "center",
        textAlign: isVertical ? "center" : "left",
        gap,
        ...style,
      }}
    >
      <BonchiLogoMark size={markSize} />

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontFamily: "Inter, system-ui, -apple-system, sans-serif",
            fontSize: titleFontSize,
            lineHeight: titleLineHeight,
            fontWeight: 750,
            letterSpacing: "-0.03em",
            color: "#123C34",
          }}
        >
          Bonchi
        </div>

        {showSubtitle && (
          <div
            style={{
              fontFamily: "'Kantumruy Pro', 'Noto Sans Khmer', sans-serif",
              fontSize: subFontSize,
              lineHeight: subLineHeight,
              fontWeight: 400,
              color: "#68736F",
              marginTop: isVertical ? "2px" : "0px",
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
