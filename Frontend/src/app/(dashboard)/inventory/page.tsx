"use client";

import React, { useState, useEffect } from "react";
import { Filter, Download, Plus, AlertTriangle, ShieldCheck, Clock, Search, X, ChevronRight, Activity } from "lucide-react";
import { apiFetch } from "@/lib/api";

const filterChips = ["All", "Healthy", "Near-Expiry", "Critical", "Low Stock"];

const statusConfig: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
    Safe: { label: "Safe", icon: ShieldCheck, cls: "bg-[#EAF7F1] text-[#2BB673] border-[#D1F0E3]" },
    Critical: { label: "Critical", icon: AlertTriangle, cls: "bg-red-50 text-red-600 border-red-100" },
    "Approaching Expiry": { label: "Approaching Expiry", icon: Clock, cls: "bg-amber-50 text-amber-600 border-amber-100" },
    Expired: { label: "Expired", icon: AlertTriangle, cls: "bg-red-50 text-red-600 border-red-100" },
    Damaged: { label: "Damaged", icon: Activity, cls: "bg-gray-50 text-gray-600 border-gray-100" },
    "Returned to Vendor": { label: "Returned", icon: Activity, cls: "bg-gray-50 text-gray-600 border-gray-100" },
    Recalled: { label: "Recalled", icon: AlertTriangle, cls: "bg-red-50 text-red-600 border-red-100" },
};

interface InventoryDrug {
    brand_name: string;
    generic_name: string;
    category: string;
    ndc: string;
}

interface InventoryBatch {
    id: number;
    batch_id: string;
    quantity: number;
    exp_date: string;
    status: string;
    drug: InventoryDrug;
}

export default function InventoryMatrix() {
    const [activeFilter, setActiveFilter] = useState("All");
    const [drawerItem, setDrawerItem] = useState<InventoryBatch | null>(null);
    const [inventoryData, setInventoryData] = useState<InventoryBatch[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchBatches() {
            try {
                // The API /inventory/batches returns the nested joined rows
                const data = await apiFetch<InventoryBatch[]>("/inventory/batches");
                setInventoryData(data);
            } catch (err) {
                console.error("Failed to fetch inventory", err);
            } finally {
                setLoading(false);
            }
        }
        fetchBatches();
    }, []);

    // Simple Map logic based on returned API strings
    const filtered = activeFilter === "All" ? inventoryData : inventoryData.filter((d) => {
        if (activeFilter === "Healthy" && d.status === "Safe") return true;
        if (activeFilter === "Near-Expiry" && d.status === "Approaching Expiry") return true;
        if (activeFilter === "Critical" && (d.status === "Critical" || d.status === "Expired")) return true;
        return false;
    });

    return (
        <div className="max-w-7xl mx-auto space-y-5 animate-in fade-in duration-400 relative">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-text-primary">Inventory Matrix</h1>
                    <p className="text-sm text-text-muted mt-0.5">FEFO sorted stock with real-time batch tracking</p>
                </div>
                <div className="flex gap-2.5">
                    <button className="flex items-center gap-2 rounded-xl bg-white dark:bg-[#020617] px-4 py-2.5 text-sm font-medium text-text-primary shadow-sm border border-[#EEF2F6] dark:border-[#1F2933] hover:bg-[#F6F8FA] dark:hover:bg-[#111827] transition-colors">
                        <Download className="h-4 w-4 text-text-muted" /> Export
                    </button>
                    <button className="flex items-center gap-2 rounded-xl bg-[#2BB673] px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-[#2BB673]/20 hover:bg-[#22996A] transition-colors">
                        <Plus className="h-4 w-4" /> Add Stock
                    </button>
                </div>
            </div>

            {/* Filter chips + Search row */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                    <Filter className="h-4 w-4 text-text-muted" />
                    {filterChips.map((chip) => (
                        <button
                            key={chip}
                            onClick={() => setActiveFilter(chip)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${activeFilter === chip
                                ? "bg-[#2BB673] text-white border-[#2BB673] shadow-sm"
                                : "bg-white text-text-muted border-[#EEF2F6] hover:border-[#2BB673]/40 hover:text-[#2BB673]"
                                }`}
                        >
                            {chip}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2 bg-white dark:bg-[#020617] border border-[#EEF2F6] dark:border-[#1F2933] rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-[#2BB673]/20 focus-within:border-[#2BB673]/40 transition-all">
                    <Search className="h-4 w-4 text-text-muted" />
                    <input type="text" placeholder="Search inventory..." className="bg-transparent text-sm outline-none text-text-primary placeholder:text-text-muted w-40" />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-[#020617] rounded-2xl border border-[#EEF2F6] dark:border-[#1F2933] shadow-[0px_10px_30px_rgba(16,24,40,0.05)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="sticky top-0 z-10" style={{ backdropFilter: "blur(8px)", background: "rgba(246,248,250,0.95)" }}>
                            <tr className="border-b border-[#EEF2F6]">
                                {["Medicine", "Category", "Batch", "Stock", "Expiry (FEFO)", "Status", ""].map((h) => (
                                    <th key={h} className="px-5 py-3.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-10 text-gray-500">Loading live data...</td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-10 text-gray-500">No batch records found in DB.</td>
                                </tr>
                            ) : filtered.map((item) => {
                                const s = statusConfig[item.status] || { label: item.status, icon: ShieldCheck, cls: "bg-gray-50 text-gray-600 border-gray-100" };
                                const SIcon = s.icon;
                                return (
                                    <tr key={item.id} className="border-b border-[#F6F8FA] hover:bg-[#F6F8FA]/80 transition-colors group">
                                        <td className="px-5 py-4">
                                            <div className="font-semibold text-text-primary text-sm">{item.drug?.brand_name || "Unknown"}</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-xs font-medium text-text-muted bg-[#F6F8FA] px-2.5 py-1 rounded-lg">{item.drug?.category || "N/A"}</span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <code className="text-xs text-text-muted bg-[#F6F8FA] border border-[#EEF2F6] px-2 py-1 rounded-lg font-mono">{item.batch_id}</code>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="font-bold text-text-primary">{item.quantity.toLocaleString()}</span>
                                            <span className="text-xs text-text-muted ml-1">units</span>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-text-muted">{new Date(item.exp_date).toLocaleDateString()}</td>
                                        <td className="px-5 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${s.cls}`}>
                                                <SIcon className="w-3 h-3" />{s.label}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <button
                                                onClick={() => setDrawerItem(item)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-[#2BB673] font-semibold flex items-center gap-1 hover:underline"
                                            >
                                                Edit <ChevronRight className="h-3 w-3" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-5 py-4 border-t border-[#EEF2F6]">
                    <span className="text-xs text-text-muted">Showing {filtered.length} entries</span>
                    <div className="flex gap-1.5">
                        <button className="px-3 py-1.5 rounded-lg border border-[#EEF2F6] text-text-muted text-xs" disabled>Prev</button>
                        <button className="px-3 py-1.5 rounded-lg border border-[#2BB673] bg-[#2BB673] text-white text-xs font-semibold">1</button>
                        <button className="px-3 py-1.5 rounded-lg border border-[#EEF2F6] text-text-muted text-xs hover:bg-[#F6F8FA]">Next</button>
                    </div>
                </div>
            </div>

            {/* Inline Edit Drawer */}
            {drawerItem && (
                <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setDrawerItem(null)}>
                    <div className="w-full max-w-sm bg-white dark:bg-[#020617] h-full shadow-2xl border-l border-[#EEF2F6] dark:border-[#1F2933] flex flex-col animate-in slide-in-from-right-4 duration-300" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EEF2F6] dark:border-[#1F2933]">
                            <h2 className="font-bold text-text-primary">Edit Stock</h2>
                            <button onClick={() => setDrawerItem(null)} className="h-8 w-8 flex items-center justify-center rounded-xl text-[#94A3B8] dark:text-[#9CA3AF] hover:bg-[#F6F8FA] dark:hover:bg-[#111827]">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="flex-1 p-6 space-y-5 overflow-y-auto">
                            <div>
                                <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Medicine</p>
                                <p className="font-semibold text-text-primary">{drawerItem.drug?.brand_name}</p>
                            </div>
                            {["Stock Quantity", "Expiry Date", "Batch Number"].map((field) => (
                                <div key={field}>
                                    <label className="block text-xs font-semibold text-text-muted mb-1.5">{field}</label>
                                    <input type="text" className="w-full px-4 py-2.5 rounded-xl border border-[#EEF2F6] dark:border-[#1F2933] bg-[#F6F8FA] dark:bg-[#020617] text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-[#2BB673]/30 focus:border-[#2BB673]/50 transition-all" defaultValue={field === "Stock Quantity" ? drawerItem.quantity : field === "Expiry Date" ? drawerItem.exp_date : drawerItem.batch_id} />
                                </div>
                            ))}
                            <div>
                                <label className="block text-xs font-semibold text-text-muted mb-1.5">Adjustment Reason</label>
                                <textarea rows={3} className="w-full px-4 py-2.5 rounded-xl border border-[#EEF2F6] dark:border-[#1F2933] bg-[#F6F8FA] dark:bg-[#020617] text-sm text-text-primary resize-none focus:outline-none focus:ring-2 focus:ring-[#2BB673]/30 focus:border-[#2BB673]/50 transition-all" placeholder="e.g. Damaged units, count correction..." />
                            </div>
                        </div>
                        <div className="p-6 border-t border-[#EEF2F6] dark:border-[#1F2933] flex gap-3">
                            <button onClick={() => setDrawerItem(null)} className="flex-1 py-2.5 rounded-xl border border-[#EEF2F6] dark:border-[#1F2933] text-text-muted text-sm font-semibold hover:bg-[#F6F8FA] dark:hover:bg-[#111827] transition-colors">Cancel</button>
                            <button className="flex-1 py-2.5 rounded-xl bg-[#2BB673] text-white text-sm font-semibold hover:bg-[#22996A] transition-colors shadow-md shadow-[#2BB673]/20">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
