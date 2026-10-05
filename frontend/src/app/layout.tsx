import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import QueryProvider from "@/providers/QueryProvider";

export const metadata: Metadata = {
  title: "Bonchi RMS — Restaurant Money App (ប្រព័ន្ធគ្រប់គ្រងចំណូលចំណាយ)",
  description: "Dual-currency USD and KHR income & expense management system for restaurants.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="km">
      <body className="min-h-screen bg-[#f5f4ef] text-[#1f1e1d] antialiased">
        <AuthProvider>
          <QueryProvider>{children}</QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
