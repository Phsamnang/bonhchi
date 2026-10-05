"use client";

import React from "react";
import { useRouter } from "next/navigation";
import CashCountModal from "@/components/CashCountModal";
import { useDashboardContext } from "../DashboardContext";

export default function CountPage() {
  const router = useRouter();
  const { showToast, handleRefreshAll } = useDashboardContext();

  return (
    <div className="w-narrow">
      <CashCountModal
        isOpen={true}
        onClose={() => router.push("/")}
        onSuccess={() => {
          showToast("បានបញ្ជាក់ការរាប់សាច់ប្រាក់ដោយជោគជ័យ!");
          router.push("/");
          handleRefreshAll();
        }}
      />
    </div>
  );
}
