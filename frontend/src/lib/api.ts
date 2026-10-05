import axios from "axios";
import { getSession, signOut } from "next-auth/react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export const api = axios.create({
  baseURL: `${BACKEND_URL}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Request Interceptor: Attach NextAuth Bearer Token
api.interceptors.request.use(
  async (config) => {
    try {
      const session = await getSession();
      if (session?.user?.accessToken) {
        config.headers.Authorization = `Bearer ${session.user.accessToken}`;
      }
    } catch {
      // Ignore if session not available yet
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isSigningOut = false;

// Response Interceptor: Format error messages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Backend rejected our token (expired / invalid) → end the session and go to login
    if (error.response?.status === 401 && typeof window !== "undefined" && !isSigningOut) {
      isSigningOut = true;
      signOut({ callbackUrl: `/login?expired=1&callbackUrl=${encodeURIComponent(window.location.pathname)}` });
    }

    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "An unexpected server error occurred";
    return Promise.reject(new Error(message));
  }
);
