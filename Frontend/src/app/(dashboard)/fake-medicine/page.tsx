"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, Search, AlertTriangle, CheckCircle2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Drug {
  ndc: string;
  brand_name: string;
  generic_name: string;
  dosage: string;
  sell_price: number;
}

interface VerificationResponse {
  ndc: string;
  batch_id: string;
  is_valid: boolean;
  reason: string;
  manufacturer_name?: string | null;
  drug_name?: string | null;
  days_to_expiry?: number | null;
}

export default function FakeMedicinePage() {
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [ndc, setNdc] = useState("");
  const [batchId, setBatchId] = useState("");
  const [result, setResult] = useState<VerificationResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadInventory() {
      try {
        const data = await apiFetch<Drug[]>("/inventory/");
        setDrugs(data);
      } catch (err) {
        console.error("Failed to load drugs for verification", err);
      }
    }
    void loadInventory();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ndc.trim() || !batchId.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await apiFetch<VerificationResponse>("/security/verify-batch", {
        method: "POST",
        body: JSON.stringify({ ndc, batch_id: batchId }),
      });
      setResult(data);
    } catch (err) {
      console.error("Failed to verify batch", err);
    } finally {
      setLoading(false);
    }
  };

  const selectedDrug = drugs.find((d) => d.ndc === ndc);

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-in fade-in duration-400">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E293B]">
            Fake Medicine Detection
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Real-time batch authentication at the point of billing.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-xl bg-[#EAF7F1] px-3 py-1.5 border border-[#BBE7D0]">
          <ShieldCheck className="h-4 w-4 text-[#2BB673]" />
          <span className="text-[11px] font-semibold text-[#166534]">
            Powered by verified batch registry
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Verification form */}
        <section className="lg:col-span-2 bg-white rounded-2xl p-6 border border-[#EEF2F6] shadow-[0px_10px_30px_rgba(16,24,40,0.05)]">
          <h2 className="text-sm font-semibold text-[#1E293B] mb-4">
            Verify Batch Before Dispensing
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1.5 block">
                  Select Drug (NDC)
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#94A3B8]" />
                  <select
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] text-xs text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2BB673]/40"
                    value={ndc}
                    onChange={(e) => setNdc(e.target.value)}
                  >
                    <option value="">Select NDC from inventory…</option>
                    {drugs.map((d) => (
                      <option key={d.ndc} value={d.ndc}>
                        {d.brand_name} ({d.ndc})
                      </option>
                    ))}
                  </select>
                </div>
                {selectedDrug && (
                  <p className="mt-1 text-[11px] text-[#94A3B8]">
                    {selectedDrug.generic_name} · {selectedDrug.dosage} · MRP ₹
                    {selectedDrug.sell_price.toFixed(2)}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1.5 block">
                  Batch ID (from pack)
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5 text-xs text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2BB673]/40"
                  placeholder="e.g. B269639"
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!ndc || !batchId || loading}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2BB673] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-[#2BB673]/20 hover:bg-[#22996A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ShieldCheck className="h-4 w-4" />
                {loading ? "Verifying…" : "Verify Batch"}
              </button>
            </div>
          </form>
        </section>

        {/* Right: Result */}
        <section className="bg-white rounded-2xl p-6 border border-[#EEF2F6] shadow-[0px_10px_30px_rgba(16,24,40,0.05)] flex flex-col">
          <h2 className="text-sm font-semibold text-[#1E293B] mb-3">
            Verification Result
          </h2>
          {!result && (
            <p className="text-xs text-[#94A3B8]">
              Enter an NDC and Batch ID from a dispensed pack to see if it matches the
              manufacturer-verified registry and your live stock.
            </p>
          )}
          {result && (
            <div
              className={`mt-2 rounded-2xl border px-4 py-3 space-y-2 ${
                result.is_valid
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <div className="flex items-center gap-2">
                {result.is_valid ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
                <p
                  className={`text-xs font-semibold ${
                    result.is_valid ? "text-emerald-700" : "text-red-700"
                  }`}
                >
                  {result.is_valid ? "Batch Verified" : "Batch Flagged"}
                </p>
              </div>
              <div className="text-[11px] text-[#4B5563] space-y-1">
                <p>
                  <span className="font-semibold">NDC:</span> {result.ndc} ·{" "}
                  <span className="font-semibold">Batch:</span> {result.batch_id}
                </p>
                {result.drug_name && (
                  <p>
                    <span className="font-semibold">Drug:</span> {result.drug_name}
                  </p>
                )}
                {result.manufacturer_name && (
                  <p>
                    <span className="font-semibold">Manufacturer:</span>{" "}
                    {result.manufacturer_name}
                  </p>
                )}
                {typeof result.days_to_expiry === "number" && (
                  <p>
                    <span className="font-semibold">Days to expiry:</span>{" "}
                    {result.days_to_expiry}
                  </p>
                )}
                <p className="mt-1">
                  <span className="font-semibold">Reason:</span> {result.reason}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

