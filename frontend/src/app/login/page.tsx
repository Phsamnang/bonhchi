"use client";

import React, { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import BonchiIcon from "@/components/BonchiIcon";
import BonchiLogo from "@/components/BonchiLogo";

type Lang = "km" | "en";

const TEXT: Record<Lang, Record<string, string>> = {
  km: {
    title: "ចូលប្រើ",
    userLabel: "លេខទូរស័ព្ទ",
    userHint: "ឬឈ្មោះអ្នកប្រើ",
    passLabel: "ពាក្យសម្ងាត់",
    passPlaceholder: "បញ្ចូលពាក្យសម្ងាត់",
    remember: "ចងចាំខ្ញុំលើឧបករណ៍នេះ",
    submit: "ចូល",
    submitting: "កំពុងចូល...",
    forgot: "ភ្លេចពាក្យសម្ងាត់? សូមទាក់ទងម្ចាស់ហាង",
    required: "សូមបញ្ចូលលេខទូរស័ព្ទ និងពាក្យសម្ងាត់",
    invalid: "លេខទូរស័ព្ទ ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ",
    expired: "សម័យប្រើប្រាស់បានផុតកំណត់ សូមចូលម្តងទៀត",
  },
  en: {
    title: "Sign in",
    userLabel: "Phone number",
    userHint: "or username",
    passLabel: "Password",
    passPlaceholder: "Enter your password",
    remember: "Remember me on this device",
    submit: "Sign in",
    submitting: "Signing in...",
    forgot: "Forgot your password? Contact the owner",
    required: "Please enter your phone number and password",
    invalid: "Incorrect phone number or password",
    expired: "Your session expired, please sign in again",
  },
};

/** Only allow same-site relative paths as a post-login destination */
function safeCallbackUrl(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/login")) return "/";
  return raw;
}

/**
 * "Remember me" off → the login only lasts until the browser closes.
 * `bonchi_alive` is a session cookie (gone when the browser closes);
 * proxy.ts treats `bonchi_remember=0` without `bonchi_alive` as logged out.
 */
function setRememberCookies(remember: boolean) {
  const thirtyDays = 60 * 60 * 24 * 30;
  document.cookie = `bonchi_remember=${remember ? "1" : "0"}; path=/; max-age=${thirtyDays}; samesite=lax`;
  document.cookie = "bonchi_alive=1; path=/; samesite=lax";
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));
  const sessionExpired = searchParams.get("expired") === "1";

  // Language remembered on this device. LoginForm renders client-side only
  // (useSearchParams under Suspense), so reading localStorage here is safe.
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem("bonchi.lang");
      return saved === "en" ? "en" : "km";
    } catch {
      return "km";
    }
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorKey, setErrorKey] = useState<string>("");
  const [errorRaw, setErrorRaw] = useState("");

  const t = TEXT[lang];

  const chooseLang = (l: Lang) => {
    setLang(l);
    try {
      localStorage.setItem("bonchi.lang", l);
    } catch {}
  };

  const handleLogin = async (u?: string, p?: string) => {
    const userToLogin = (u ?? username).trim();
    const passToLogin = p ?? password;

    if (!userToLogin || !passToLogin) {
      setErrorKey("required");
      return;
    }

    setLoading(true);
    setErrorKey("");
    setErrorRaw("");

    try {
      const res = await signIn("credentials", {
        username: userToLogin,
        password: passToLogin,
        redirect: false,
      });

      if (res?.error) {
        setErrorKey("invalid");
      } else if (res?.ok) {
        setRememberCookies(remember);
        window.location.href = callbackUrl;
      }
    } catch (err) {
      setErrorRaw(err instanceof Error ? err.message : "Failed to connect to authentication server");
    } finally {
      setLoading(false);
    }
  };

  const errorText = errorKey ? t[errorKey] : errorRaw;

  return (
    <div
      className="bc t-light"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 16px",
        boxSizing: "border-box",
        background: "var(--surface)",
        color: "var(--ink)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
        }}
      >
        {/* Brand */}
        <BonchiLogo
          size={56}
          layout="vertical"
          subtitle="បញ្ជី · ចំណូល · ចំណាយ"
          style={{ marginBottom: "4px" }}
        />

        <div className="w-panel" style={{ width: "100%", boxSizing: "border-box", padding: "28px" }}>
          <form
            style={{ width: "100%", display: "flex", flexDirection: "column", gap: "20px" }}
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
          >
            <div className="p-row" style={{ justifyContent: "space-between" }}>
              <h1 style={{ margin: 0, font: "600 26px/40px var(--font-sans)" }}>{t.title}</h1>
              <div className="w-cur" role="group" aria-label="Language">
                <button
                  type="button"
                  aria-pressed={lang === "km"}
                  onClick={() => chooseLang("km")}
                  style={{ minWidth: "64px" }}
                >
                  ខ្មែរ
                </button>
                <button
                  type="button"
                  aria-pressed={lang === "en"}
                  onClick={() => chooseLang("en")}
                  style={{ minWidth: "64px" }}
                >
                  English
                </button>
              </div>
            </div>

            {sessionExpired && !errorText && (
              <div className="bc-banner bc-banner-warning" role="status">
                <BonchiIcon name="alert" size={20} />
                <div className="bc-banner-main">{t.expired}</div>
              </div>
            )}

            {errorText && (
              <div className="bc-banner bc-banner-danger" role="alert">
                <BonchiIcon name="alert" size={20} />
                <div className="bc-banner-main">{errorText}</div>
              </div>
            )}

            <label className="bc-field">
              <span className="bc-field-label">
                {t.userLabel}
                <small>{t.userHint}</small>
              </span>
              <span className="bc-input">
                <BonchiIcon name="user" size={20} />
                <input
                  type="text"
                  placeholder="012 345 678"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </span>
            </label>

            <label className="bc-field">
              <span className="bc-field-label">{t.passLabel}</span>
              <span className="bc-input">
                <input
                  type="password"
                  placeholder={t.passPlaceholder}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </span>
            </label>

            <label className="p-row" style={{ gap: "10px", fontSize: "15px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                style={{ width: "20px", height: "20px", accentColor: "var(--brand)" }}
              />
              {t.remember}
            </label>

            <button
              type="submit"
              className={`p-btn ${loading ? "p-btn-off" : ""}`}
              disabled={loading}
              style={{ border: 0, cursor: "pointer", width: "100%" }}
            >
              {loading ? t.submitting : t.submit}
            </button>

            <div className="p-muted" style={{ textAlign: "center" }}>
              {t.forgot}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
