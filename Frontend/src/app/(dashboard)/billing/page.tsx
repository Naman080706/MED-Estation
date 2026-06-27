"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Search, ChevronRight, CreditCard, Trash2, ArrowLeft } from "lucide-react";

interface Drug {
  ndc: string;
  brand_name: string;
  generic_name: string;
  dosage: string;
  sell_price: number;
  purchase_price: number;
  sup_id: number;
  category?: string | null;
}

interface CartItem {
  ndc: string;
  name: string;
  dosage: string;
  unitPrice: number;
  qty: number;
}

export default function BillingPage() {
  const router = useRouter();
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadInventory() {
      try {
        const data = await apiFetch<Drug[]>("/inventory/");
        setDrugs(data);
      } catch (err) {
        console.error("Failed to load inventory for billing", err);
      }
    }
    loadInventory();
  }, []);

  const filteredDrugs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return drugs.slice(0, 40);
    return drugs.filter((d) => {
      return (
        d.ndc.toLowerCase().includes(term) ||
        d.brand_name.toLowerCase().includes(term) ||
        d.generic_name.toLowerCase().includes(term)
      );
    });
  }, [drugs, search]);

  const handleAddToCart = (drug: Drug) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.ndc === drug.ndc);
      if (existing) {
        return prev.map((c) =>
          c.ndc === drug.ndc ? { ...c, qty: c.qty + 1 } : c
        );
      }
      return [
        ...prev,
        {
          ndc: drug.ndc,
          name: drug.brand_name || drug.generic_name,
          dosage: drug.dosage,
          unitPrice: drug.sell_price,
          qty: 1,
        },
      ];
    });
  };

  const handleQtyChange = (ndc: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.ndc === ndc ? { ...item, qty: Math.max(1, item.qty + delta) } : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const handleRemove = (ndc: string) => {
    setCart((prev) => prev.filter((item) => item.ndc !== ndc));
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + item.qty * item.unitPrice,
    0
  );
  const grandTotal = subtotal;

  const handleSubmit = async () => {
    if (!cart.length) return;
    setSubmitting(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await Promise.all(
        cart.map((item) =>
          apiFetch("/prescriptions/", {
            method: "POST",
            body: JSON.stringify({
              patient_id: 2025001,
              doctor_id: 1,
              drug_ndc: item.ndc,
              quantity: item.qty,
              days_supply: 7,
              refills_remaining: 0,
              status: "filled",
              issued_date: today,
            }),
          })
        )
      );
      setCart([]);
    } catch (err) {
      console.error("Failed to submit billing", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-400">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-[#111827]">
              Billing & POS
            </h1>
            <p className="text-xs sm:text-sm text-[#6B7280] mt-0.5">
              Fast checkout for walk-in prescriptions, directly linked to live inventory.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Cart & totals */}
        <section className="lg:col-span-1 bg-white border border-[#E5E7EB] rounded-[18px] shadow-[0_8px_24px_rgba(15,23,42,0.06)] flex flex-col">
          <div className="px-5 pt-5 pb-3 border-b border-[#F3F4F6] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#111827]">Current Bill</h2>
              <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                {cart.length ? `${cart.length} line item(s)` : "No items added yet"}
              </p>
            </div>
            <CreditCard className="h-5 w-5 text-[#2BB673]" />
          </div>

          <div className="flex-1 px-5 py-3 space-y-3 overflow-y-auto max-h-[260px]">
            {cart.length === 0 ? (
              <p className="text-xs text-[#9CA3AF]">
                Search drugs on the right and click a row to add it to this bill.
              </p>
            ) : (
              cart.map((item) => (
                <div
                  key={item.ndc}
                  className="flex items-center justify-between rounded-xl border border-[#F3F4F6] px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#111827] truncate">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-[#9CA3AF]">
                      {item.dosage} · NDC {item.ndc}
                    </p>
                    <p className="text-[11px] text-[#10B981] mt-0.5">
                      ₹{item.unitPrice.toFixed(2)} / unit
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleQtyChange(item.ndc, -1)}
                        className="h-6 w-6 flex items-center justify-center rounded-md border border-[#E5E7EB] text-[13px] hover:bg-[#F3F4F6]"
                      >
                        -
                      </button>
                      <span className="text-xs font-semibold w-5 text-center">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQtyChange(item.ndc, 1)}
                        className="h-6 w-6 flex items-center justify-center rounded-md border border-[#E5E7EB] text-[13px] hover:bg-[#F3F4F6]"
                      >
                        +
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-[#111827]">
                        ₹{(item.qty * item.unitPrice).toFixed(2)}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleRemove(item.ndc)}
                        className="h-6 w-6 flex items-center justify-center rounded-md border border-[#FEE2E2] text-red-500 hover:bg-[#FEF2F2]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-5 pt-3 pb-4 border-t border-[#F3F4F6] space-y-2">
            <div className="flex items-center justify-between text-xs text-[#6B7280]">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-[#6B7280]">
              <span>Discount</span>
              <span>₹0.00</span>
            </div>
            <div className="flex items-center justify-between text-sm font-semibold text-[#111827] mt-1">
              <span>Total Payable</span>
              <span>₹{grandTotal.toFixed(2)}</span>
            </div>
            <button
              type="button"
              disabled={!cart.length || submitting}
              onClick={handleSubmit}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-[14px] bg-[#111827] text-white text-sm font-semibold py-2.5 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black transition-colors"
            >
              <span>{submitting ? "Processing..." : "Confirm & Record Billing"}</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        {/* Right: Drug search & pick list */}
        <section className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded-[18px] shadow-[0_8px_24px_rgba(15,23,42,0.06)] flex flex-col">
          <div className="px-5 pt-5 pb-3 border-b border-[#F3F4F6] flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[#111827]">Select Drugs</h2>
              <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                Live from inventory master · tap a row to add to bill.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-[#F9FAFB] border border-[#E5E7EB] px-3 py-1.5">
              <Search className="h-3.5 w-3.5 text-[#9CA3AF]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by brand, generic, or NDC"
                className="bg-transparent text-xs outline-none w-44 sm:w-60 placeholder:text-[#D1D5DB] text-[#111827]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <div className="max-h-[360px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-[#F9FAFB] text-[#6B7280] sticky top-0 z-10">
                  <tr>
                    <th className="text-left font-medium px-4 py-2">Drug</th>
                    <th className="text-left font-medium px-2 py-2">Dosage</th>
                    <th className="text-right font-medium px-2 py-2">MRP (₹)</th>
                    <th className="text-right font-medium px-4 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDrugs.map((drug) => (
                    <tr
                      key={drug.ndc}
                      className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB] cursor-pointer"
                      onClick={() => handleAddToCart(drug)}
                    >
                      <td className="px-4 py-2 align-middle">
                        <p className="font-semibold text-[#111827] truncate max-w-[180px]">
                          {drug.brand_name}
                        </p>
                        <p className="text-[11px] text-[#9CA3AF]">
                          {drug.generic_name} · NDC {drug.ndc}
                        </p>
                      </td>
                      <td className="px-2 py-2 text-[#4B5563] align-middle">
                        {drug.dosage}
                      </td>
                      <td className="px-2 py-2 text-right text-[#111827] align-middle">
                        {drug.sell_price?.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right align-middle">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-[12px] border border-[#E5E7EB] px-2 py-1 text-[11px] text-[#111827] hover:bg-[#111827] hover:text-white transition-colors"
                        >
                          Add
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredDrugs.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-[11px] text-[#9CA3AF]"
                      >
                        No drugs found for this search. Try a different name or NDC.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

