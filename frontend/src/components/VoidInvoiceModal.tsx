"use client";

import React, { useState } from "react";
import { useVoidInvoiceMutation } from "@/hooks/useInvoices";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface VoidInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: { id: string | number; invoice_no: string; supplier_name: string; total_usd: number; total_khr: number } | null;
  onSuccess?: () => void;
}

export default function VoidInvoiceModal({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}: VoidInvoiceModalProps) {
  const [reason, setReason] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const mutation = useVoidInvoiceMutation();

  if (!invoice) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg("សូមបញ្ចូលមូលហេតុនៃការមោឃភាព (Reason is required)");
      return;
    }

    setErrorMsg("");

    try {
      await mutation.mutateAsync({
        id: invoice.id,
        reason: reason.trim(),
      });

      setReason("");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || "Failed to void invoice");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogHeader onClose={onClose}>
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-[#ffeef0] text-[#cb2431] flex items-center justify-center text-lg">
            🚫
          </span>
          <div>
            <DialogTitle>មោឃភាពវិក្កយបត្រ (Soft-Void)</DialogTitle>
            <DialogDescription>Invoice #{invoice.invoice_no}</DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-[#ffeef0] border border-[#cf222e]/20 text-[#cf222e] rounded-xl text-xs font-semibold">
              ⚠️ {errorMsg}
            </div>
          )}

          <div className="p-3.5 bg-[#fbfaf6] border border-[#e5e4de] rounded-xl space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-[#6b6a68]">អ្នកផ្គត់ផ្គង់/ចំណាយ:</span>
              <span className="font-bold text-[#1f1e1d]">{invoice.supplier_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b6a68]">ចំនួនទឹកប្រាក់:</span>
              <span className="font-bold text-[#1f1e1d]">
                ${invoice.total_usd.toFixed(2)} · {invoice.total_khr.toLocaleString()} ៛
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#6b6a68] mb-1">
              មូលហេតុនៃការមោឃភាព (Audit Void Reason) <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. បញ្ចូលច្រឡំចំនួនទឹកប្រាក់ ឬ ទំនិញខូចត្រូវដកចេញ"
              required
              autoFocus
            />
          </div>

          <p className="text-[11px] text-[#6b6a68] italic">
            * វិក្កយបត្រនឹងត្រូវកត់ត្រាជា Soft-Void ហើយសមតុល្យកាបូបនឹងត្រូវបង្វិលសងដោយស្វ័យប្រវត្តិតាមច្បាប់គណនេយ្យ។
          </p>

          <div className="pt-2 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              បោះបង់ (Cancel)
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={mutation.isPending}
              className="flex-1"
            >
              {mutation.isPending ? "កំពុងមោឃភាព..." : "បញ្ជាក់មោឃភាព (Confirm Void)"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
