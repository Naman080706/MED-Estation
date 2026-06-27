"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, AlertTriangle, Search } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface ExchangeListing {
  ndc: string;
  drug_name: string;
  batch_id: string;
  quantity: number;
  days_to_expiry: number;
  estimated_loss_value: number;
  priority: "Critical" | "High" | "Medium" | string;
}

interface Drug {
  ndc: string;
  brand_name: string;
  generic_name: string;
  dosage: string;
}

interface ExchangeProposalResponse {
  id: number;
  from_ndc: string;
  from_batch_id: string;
  from_quantity: number;
  to_ndc: string;
  to_quantity: number;
  supplier_id: number;
  status: string;
}

export default function ExpiryExchangePage() {
  const [listings, setListings] = useState<ExchangeListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [proposals, setProposals] = useState<ExchangeProposalResponse[]>([]);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [activeListing, setActiveListing] = useState<ExchangeListing | null>(null);
  const [toNdc, setToNdc] = useState("");
  const [toQty, setToQty] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch<ExchangeListing[]>("/exchange/near-expiry", {
          params: { days: 60 },
        });
        setListings(data);
        const inv = await apiFetch<Drug[]>("/inventory/");
        setDrugs(inv);
        const existing = await apiFetch<ExchangeProposalResponse[]>("/exchange/proposals");
        setProposals(existing);
      } catch (err) {
        console.error("Failed to load expiry exchange data", err);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

  const filteredBase = useMemo(
    () =>
      listings.filter(
        (l) => l.priority === "Critical" || l.priority === "High"
      ),
    [listings]
  );

  const filteredListings = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term || term.length < 3) return filteredBase;
    return filteredBase.filter(
      (l) =>
        l.drug_name.toLowerCase().includes(term) ||
        l.ndc.toLowerCase().includes(term)
    );
  }, [filteredBase, searchTerm]);

  const suggestionNames = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term || term.length < 3) return [];
    const names = new Set<string>();
    filteredBase.forEach((l) => {
      if (l.drug_name.toLowerCase().startsWith(term)) {
        names.add(l.drug_name);
      }
    });
    return Array.from(names).slice(0, 6);
  }, [filteredBase, searchTerm]);

  const openProposal = (listing: ExchangeListing) => {
    setActiveListing(listing);
    setToNdc("");
    setToQty(listing.quantity);
    setShowProposalForm(true);
  };

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeListing || !toNdc || !toQty) return;
    setSubmitting(true);
    try {
      const created = await apiFetch<ExchangeProposalResponse>("/exchange/proposals", {
        method: "POST",
        body: JSON.stringify({
          from_ndc: activeListing.ndc,
          from_batch_id: activeListing.batch_id,
          from_quantity: toQty,
          to_ndc: toNdc,
          to_quantity: toQty,
        }),
      });
      setProposals((prev) => [created, ...prev]);
      setShowProposalForm(false);
      setActiveListing(null);
    } catch (err) {
      console.error("Failed to create exchange proposal", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-in fade-in duration-400">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E293B]">
            Expiry Exchange Network
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Turn near-expiry inventory into recoverable value instead of dead stock.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-xl bg-[#E5E7FB] px-3 py-1.5 border border-[#CBD5F5]">
          <ArrowLeftRight className="h-4 w-4 text-[#4F46E5]" />
          <span className="text-[11px] font-semibold text-[#312E81]">
            Powered by live FEFO & pricing
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-[#EEF2F6] shadow-[0px_10px_30px_rgba(16,24,40,0.05)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[#1E293B] flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Near-Expiry Inventory (Next 60 days)
            </h2>
            <p className="text-[11px] text-[#94A3B8]">
              Based entirely on your current stock batches and purchase prices.
            </p>
          </div>
          <div className="w-full max-w-xs relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#94A3B8]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Type at least 3 letters of a drug or NDC…"
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] text-xs text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2BB673]/30"
            />
            {suggestionNames.length > 0 && (
              <div className="absolute mt-1 w-full rounded-xl border border-[#E5E7EB] bg-white shadow-lg shadow-black/5 z-10">
                {suggestionNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setSearchTerm(name)}
                    className="w-full text-left px-3 py-1.5 text-[11px] text-[#111827] hover:bg-[#F3F4F6]"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {loading && (
          <p className="text-xs text-[#94A3B8]">Scanning inventory for near-expiry batches…</p>
        )}

        {!loading && !filteredListings.length && (
          <p className="text-xs text-[#94A3B8]">
            No Critical or High priority near-expiry batches detected for this filter. Your expiry risk is currently low.
          </p>
        )}

        {!loading && filteredListings.length > 0 && (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-xs">
              <thead className="bg-[#F9FAFB] text-[#6B7280]">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Drug / NDC</th>
                  <th className="text-left font-medium px-3 py-2">Batch</th>
                  <th className="text-right font-medium px-3 py-2">Qty</th>
                  <th className="text-right font-medium px-3 py-2">Days to Expiry</th>
                  <th className="text-right font-medium px-3 py-2">Est. Loss (₹)</th>
                  <th className="text-right font-medium px-3 py-2">Priority</th>
                  <th className="text-right font-medium px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredListings.map((item, idx) => {
                  const badgeClasses =
                    item.priority === "Critical"
                      ? "bg-red-50 text-red-600 border-red-200"
                      : "bg-amber-50 text-amber-600 border-amber-200";
                  return (
                    <tr
                      key={`${item.ndc}-${item.batch_id}-${idx}`}
                      className="border-b border-[#F1F5F9] last:border-0"
                    >
                      <td className="px-3 py-2 align-middle">
                        <p className="font-semibold text-[#1E293B] truncate max-w-[180px]">
                          {item.drug_name}
                        </p>
                        <p className="text-[11px] text-[#94A3B8]">NDC {item.ndc}</p>
                      </td>
                      <td className="px-3 py-2 align-middle text-[#4B5563]">
                        {item.batch_id}
                      </td>
                      <td className="px-3 py-2 align-middle text-right text-[#1E293B]">
                        {item.quantity}
                      </td>
                      <td className="px-3 py-2 align-middle text-right text-[#1E293B]">
                        {item.days_to_expiry}d
                      </td>
                      <td className="px-3 py-2 align-middle text-right text-[#1E293B]">
                        {formatter.format(item.estimated_loss_value)}
                      </td>
                      <td className="px-3 py-2 align-middle text-right">
                        <span
                          className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full border text-[10px] font-semibold ${badgeClasses}`}
                        >
                          {item.priority}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-middle text-right">
                        <button
                          type="button"
                          onClick={() => openProposal(item)}
                          className="inline-flex items-center justify-center rounded-xl border border-[#2BB673] text-[#2BB673] text-[11px] px-2.5 py-1 hover:bg-[#2BB673] hover:text-white transition-colors"
                        >
                          Propose Exchange
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showProposalForm && activeListing && (
        <div className="bg-white rounded-2xl p-5 border border-[#EEF2F6] shadow-[0px_10px_30px_rgba(16,24,40,0.05)]">
          <h2 className="text-sm font-semibold text-[#1E293B] mb-3">
            Create Exchange Proposal
          </h2>
          <p className="text-[11px] text-[#64748B] mb-3">
            You are offering{" "}
            <span className="font-semibold">
              {activeListing.quantity} units of {activeListing.drug_name} (NDC{" "}
              {activeListing.ndc}, batch {activeListing.batch_id})
            </span>{" "}
            to its linked supplier, and requesting a different medicine in return.
          </p>
          <form onSubmit={handleSubmitProposal} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1.5 block">
                  Requested Replacement Drug
                </label>
                <select
                  className="w-full rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-xs text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2BB673]/30"
                  value={toNdc}
                  onChange={(e) => setToNdc(e.target.value)}
                >
                  <option value="">Select from inventory…</option>
                  {drugs.map((d) => (
                    <option key={d.ndc} value={d.ndc}>
                      {d.brand_name} ({d.ndc})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1.5 block">
                  Units to Send / Request
                </label>
                <input
                  type="number"
                  min={1}
                  max={activeListing.quantity}
                  value={toQty}
                  onChange={(e) => setToQty(Number(e.target.value))}
                  className="w-full rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-xs text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2BB673]/30"
                />
                <p className="mt-1 text-[10px] text-[#94A3B8]">
                  Max {activeListing.quantity} units available from this batch.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowProposalForm(false);
                  setActiveListing(null);
                }}
                className="px-3 py-1.5 text-[11px] font-medium rounded-xl border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!toNdc || !toQty || submitting}
                className="px-4 py-1.5 text-[11px] font-semibold rounded-xl bg-[#2BB673] text-white hover:bg-[#22996A] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting…" : "Submit Proposal"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl p-5 border border-[#EEF2F6] shadow-[0px_10px_30px_rgba(16,24,40,0.05)]">
        <h2 className="text-sm font-semibold text-[#1E293B] mb-3">
          Proposed Exchanges
        </h2>
        {proposals.length === 0 ? (
          <p className="text-xs text-[#94A3B8]">
            No exchange proposals created yet. Use the table above to propose your
            first expiry exchange.
          </p>
        ) : (
          <div className="space-y-2">
            {proposals.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-[#EEF2F6] px-3 py-2 text-[11px]"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-[#1E293B]">
                    Send {p.from_quantity} × {p.from_ndc} → Request {p.to_quantity} ×{" "}
                    {p.to_ndc}
                  </p>
                  <p className="text-[#94A3B8]">
                    Supplier ID {p.supplier_id} · Status:{" "}
                    <span className="font-semibold">{p.status}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

