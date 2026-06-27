"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MessageCircle, CheckCircle2, Clock, AlertCircle, ArrowUpRight, RotateCcw, Search } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Supplier {
    id: number;
    name: string;
    address: string;
    phone: string;
    email: string;
    reliability_score: number;
}

interface BackendReorderSuggestion {
    ndc: string;
    drug_name: string;
    current_stock: number;
    predicted_30d_demand: number;
    suggested_reorder_qty: number;
    supplier_id: number;
    estimated_value?: number;
}

interface PurchaseOrderRow {
    supplierName: string;
    avatar: string;
    items: number;
    valueINR: string;
    status: string;
    priority: "High" | "Medium" | "Low";
    statusColor: string;
    priorityColor: string;
}

interface AuditLogEntry {
    id: number;
    action: string;
    user_id: string;
    data_payload: string;
    timestamp: string;
}

interface NotificationItem {
    title: string;
    msg: string;
    type: "success" | "warning" | "info";
    time: string;
}

interface ReturnWindow {
    vendor: string;
    daysLeft: number;
    item: string;
    credit: string;
}

export default function SupplierProcurement() {
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderRow[]>([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [notificationFeed, setNotificationFeed] = useState<NotificationItem[]>([]);
    const [returnItems, setReturnItems] = useState<ReturnWindow[]>([]);
    const [loading, setLoading] = useState(true);
    const [suppliersState, setSuppliersState] = useState<Supplier[]>([]);
    const [showComposer, setShowComposer] = useState(false);
    const [messageVendorId, setMessageVendorId] = useState<number | "all">("all");
    const [messageBody, setMessageBody] = useState("");
    const [supplierSearch, setSupplierSearch] = useState("");
    const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const [suppliers, suggestions, audit] = await Promise.all([
                    apiFetch<Supplier[]>("/suppliers/"),
                    apiFetch<BackendReorderSuggestion[]>("/reports/reorder-suggestions"),
                    apiFetch<AuditLogEntry[]>("/reports/audit-log", { params: { limit: 6 } }),
                ]);

                setSuppliersState(suppliers);

                const supplierMap = new Map<number, Supplier>();
                suppliers.forEach((s) => supplierMap.set(s.id, s));

                const grouped = new Map<number, BackendReorderSuggestion[]>();
                for (const s of suggestions) {
                    if (!s.supplier_id) continue;
                    const list = grouped.get(s.supplier_id) ?? [];
                    list.push(s);
                    grouped.set(s.supplier_id, list);
                }

                const formatter = new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0,
                });

                const orders: PurchaseOrderRow[] = [];
                grouped.forEach((items, supId) => {
                    const sup = supplierMap.get(supId);
                    if (!sup) return;
                    const totalValue = items.reduce(
                        (sum, it) => sum + (it.estimated_value ?? 0),
                        0
                    );
                    const priority: "High" | "Medium" | "Low" =
                        sup.reliability_score < 0.7
                            ? "High"
                            : sup.reliability_score < 0.9
                            ? "Medium"
                            : "Low";
                    const priorityColor =
                        priority === "High"
                            ? "text-red-500"
                            : priority === "Medium"
                            ? "text-amber-500"
                            : "text-[#2BB673]";
                    const statusColor =
                        priority === "High"
                            ? "text-red-600 bg-red-50 border-red-100"
                            : priority === "Medium"
                            ? "text-amber-600 bg-amber-50 border-amber-100"
                            : "text-blue-600 bg-blue-50 border-blue-100";

                    const avatar =
                        sup.name
                            .split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((p) => p[0]?.toUpperCase())
                            .join("") || "SP";

                    orders.push({
                        supplierName: sup.name,
                        avatar,
                        items: items.length,
                        valueINR: formatter.format(totalValue),
                        status: "Awaiting Approval",
                        priority,
                        statusColor,
                        priorityColor,
                    });
                });

                orders.sort((a, b) => {
                    const order = { High: 0, Medium: 1, Low: 2 } as const;
                    return order[a.priority] - order[b.priority];
                });

                setPurchaseOrders(orders);
                setPendingCount(orders.length);

                const notifs: NotificationItem[] = audit.slice(0, 5).map((entry) => ({
                    title: entry.action.replace(/_/g, " "),
                    msg: entry.data_payload.slice(0, 140),
                    type: entry.action.includes("ERROR")
                        ? "warning"
                        : entry.action.includes("STOCK")
                        ? "success"
                        : "info",
                    time: new Date(entry.timestamp).toLocaleString("en-IN", {
                        month: "short",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                    }),
                }));
                setNotificationFeed(notifs);

                const windows: ReturnWindow[] = suggestions.slice(0, 3).map((s) => {
                    const sup = supplierMap.get(s.supplier_id);
                    return {
                        vendor: sup?.name ?? "Supplier",
                        daysLeft: 7 + Math.floor(Math.random() * 14),
                        item: `${s.suggested_reorder_qty} units ${s.drug_name}`,
                        credit: "Eligible for partial credit on near-expiry returns",
                    };
                });
                setReturnItems(windows);
            } catch (err) {
                console.error("Failed to load supplier view data", err);
            } finally {
                setLoading(false);
            }
        }

        void load();
    }, []);

    const handleApproveAll = () => {
        if (!purchaseOrders.length) return;
        setPurchaseOrders([]);
        setPendingCount(0);
    };

    const handleMessageSend = () => {
        if (!messageBody.trim()) return;
        // Mock send: just close composer and clear message
        setShowComposer(false);
        setMessageBody("");
        setMessageVendorId("all");
    };

    const handleRecipientChange: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
        const val = e.target.value;
        setMessageVendorId(val === "all" ? "all" : Number(val));
    };

    const filteredSuppliers = useMemo(() => {
        const term = supplierSearch.trim().toLowerCase();
        if (!term) return suppliersState;
        return suppliersState.filter((s) =>
            s.name.toLowerCase().includes(term) || s.email.toLowerCase().includes(term)
        );
    }, [suppliersState, supplierSearch]);

    const topSuppliers = useMemo(
        () =>
            filteredSuppliers
                .slice()
                .sort((a, b) => b.reliability_score - a.reliability_score)
                .slice(0, 3),
        [filteredSuppliers]
    );

    const selectedSupplier =
        selectedSupplierId != null
            ? suppliersState.find((s) => s.id === selectedSupplierId) || null
            : topSuppliers[0] || null;

    return (
        <div className="max-w-7xl mx-auto space-y-5 animate-in fade-in duration-400">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#1E293B] dark:text-[#F9FAFB]">Supplier & Procurement</h1>
                    <p className="text-sm text-[#64748B] dark:text-[#9CA3AF] mt-0.5">Manage vendor relations, PO approvals, and returns</p>
                </div>
                <div className="flex gap-2.5">
                    <button
                        className="flex items-center gap-2 rounded-xl bg-white dark:bg-[#020617] px-4 py-2.5 text-sm font-medium text-[#1E293B] dark:text-[#F9FAFB] shadow-sm border border-[#EEF2F6] dark:border-[#1F2933] hover:bg-[#F6F8FA] dark:hover:bg-[#111827] transition-colors"
                        type="button"
                        onClick={() => setShowComposer(true)}
                    >
                        <MessageCircle className="h-4 w-4 text-[#64748B] dark:text-[#9CA3AF]" /> Message Vendors
                    </button>
                    <button
                        className="flex items-center gap-2 rounded-xl bg-[#2BB673] px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-[#2BB673]/20 hover:bg-[#22996A] transition-colors"
                        onClick={handleApproveAll}
                        disabled={!purchaseOrders.length}
                    >
                        <CheckCircle2 className="h-4 w-4" /> Approve All Pending
                    </button>
                </div>
            </div>

            {/* Supplier directory: search + top 3 + detail */}
            <div className="bg-white dark:bg-[#020617] rounded-2xl p-6 border border-[#EEF2F6] dark:border-[#1F2933] shadow-[0px_10px_30px_rgba(16,24,40,0.05)]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                    <div>
                        <h2 className="text-sm font-semibold text-[#1E293B] dark:text-[#F9FAFB]">Supplier Directory</h2>
                        <p className="text-[11px] text-[#64748B] dark:text-[#9CA3AF] mt-0.5">
                            Search vendors from the live database or tap a top partner to see details.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-[#F9FAFB] dark:bg-[#020617] border border-[#E5E7EB] dark:border-[#1F2933] px-3 py-1.5 w-full max-w-xs">
                        <Search className="h-3.5 w-3.5 text-[#94A3B8] dark:text-[#9CA3AF]" />
                        <input
                            type="text"
                            value={supplierSearch}
                            onChange={(e) => setSupplierSearch(e.target.value)}
                            placeholder="Search by name or email…"
                            className="bg-transparent text-xs outline-none w-full text-[#111827] dark:text-[#F9FAFB] placeholder:text-[#D1D5DB]"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        {topSuppliers.map((s) => (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => setSelectedSupplierId(s.id)}
                                className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs transition-colors ${
                                    selectedSupplier && selectedSupplier.id === s.id
                                        ? "border-[#2BB673] bg-[#EAF7F1]"
                                        : "border-[#EEF2F6] hover:border-[#2BB673]/40 hover:bg-[#F6F8FA]"
                                }`}
                            >
                                <p className="font-semibold text-[#1E293B]">{s.name}</p>
                                <p className="text-[11px] text-[#64748B] truncate">{s.email}</p>
                            </button>
                        ))}
                        {!topSuppliers.length && (
                            <p className="text-[11px] text-[#94A3B8]">
                                No suppliers found in the database yet.
                            </p>
                        )}
                    </div>
                    <div className="md:col-span-2">
                        {selectedSupplier ? (
                            <div className="rounded-xl border border-[#EEF2F6] dark:border-[#1F2933] bg-[#F9FAFB] dark:bg-[#020617] px-4 py-3 text-xs space-y-1.5">
                                <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
                                    Supplier details
                                </p>
                                <p className="text-sm font-bold text-[#1E293B] dark:text-[#F9FAFB]">
                                    {selectedSupplier.name}
                                </p>
                                <p className="text-[11px] text-[#64748B] dark:text-[#9CA3AF]">
                                    Email: {selectedSupplier.email}
                                </p>
                                <p className="text-[11px] text-[#64748B] dark:text-[#9CA3AF]">
                                    Phone: {selectedSupplier.phone}
                                </p>
                                <p className="text-[11px] text-[#64748B] dark:text-[#9CA3AF]">
                                    Address: {selectedSupplier.address}
                                </p>
                                <p className="text-[11px] text-[#64748B] dark:text-[#9CA3AF]">
                                    Reliability score:{" "}
                                    <span className="font-semibold text-[#2BB673]">
                                        {selectedSupplier.reliability_score.toFixed(2)}
                                    </span>
                                </p>
                            </div>
                        ) : (
                            <p className="text-[11px] text-[#94A3B8]">
                                Select a supplier on the left to view live details.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {showComposer && (
                <div className="bg-white rounded-2xl p-5 border border-[#EEF2F6] shadow-[0px_10px_30px_rgba(16,24,40,0.05)]">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                        <label className="text-xs font-semibold text-[#64748B] sm:w-20 shrink-0">To</label>
                        <select
                            className="flex-1 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-xs text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2BB673]/40"
                            value={messageVendorId === "all" ? "all" : String(messageVendorId)}
                            onChange={handleRecipientChange}
                        >
                            <option value="all">All vendors in database</option>
                            {suppliersState.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-[#64748B] block mb-2">Message</label>
                        <textarea
                            rows={3}
                            className="w-full rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-xs text-[#111827] resize-none focus:outline-none focus:ring-2 focus:ring-[#2BB673]/40"
                            placeholder="Type a short note about pricing, lead times, or returns…"
                            value={messageBody}
                            onChange={(e) => setMessageBody(e.target.value)}
                        />
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setShowComposer(false);
                                setMessageBody("");
                                setMessageVendorId("all");
                            }}
                            className="px-3 py-1.5 text-xs font-medium rounded-xl border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6]"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleMessageSend}
                            disabled={!messageBody.trim()}
                            className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-[#2BB673] text-white hover:bg-[#22996A] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Send
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Left — Approval queue + notification feed */}
                <div className="lg:col-span-2 space-y-5">

                    {/* Approval Queue */}
                    <div className="bg-white rounded-2xl p-6 border border-[#EEF2F6] shadow-[0px_10px_30px_rgba(16,24,40,0.05)]">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-semibold text-[#1E293B] flex items-center gap-2">
                                <Clock className="h-4 w-4 text-[#64748B]" /> Reorder Approval Queue
                            </h2>
                            <span className="text-xs font-bold text-white bg-[#2BB673] px-2.5 py-1 rounded-full">
                                {pendingCount} Pending
                            </span>
                        </div>
                        <div className="space-y-3">
                            {loading && !purchaseOrders.length && (
                                <p className="text-xs text-[#94A3B8]">Loading predictive purchase orders from live data…</p>
                            )}
                            {!loading && purchaseOrders.length === 0 && (
                                <p className="text-xs text-[#94A3B8]">
                                    No pending AI-based purchase orders right now. Inventory is healthy.
                                </p>
                            )}
                            {purchaseOrders.map((po, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between p-4 rounded-2xl border border-[#EEF2F6] hover:border-[#2BB673]/30 hover:bg-[#EAF7F1]/20 transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-[#EAF7F1] flex items-center justify-center text-[#2BB673] font-bold text-xs shrink-0">
                                            {po.avatar}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-[#1E293B] text-sm group-hover:text-[#2BB673] transition-colors">
                                                {po.supplierName}
                                            </h4>
                                            <p className="text-xs text-[#94A3B8] mt-0.5">
                                                {po.items} items ·{" "}
                                                <span className={`font-semibold ${po.priorityColor}`}>{po.priority} Priority</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="font-bold text-[#1E293B] text-sm">{po.valueINR}</div>
                                            <span
                                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${po.statusColor}`}
                                            >
                                                {po.status}
                                            </span>
                                        </div>
                                        <button className="px-3 py-1.5 rounded-xl border border-[#2BB673] text-[#2BB673] text-xs font-semibold hover:bg-[#2BB673] hover:text-white transition-colors hidden sm:block">
                                            Review PO
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Notification Feed */}
                    <div className="bg-white rounded-2xl p-6 border border-[#EEF2F6] shadow-[0px_10px_30px_rgba(16,24,40,0.05)]">
                        <h2 className="font-semibold text-[#1E293B] mb-4 flex items-center gap-2">
                            <MessageCircle className="h-4 w-4 text-[#64748B]" /> Vendor Notifications
                        </h2>
                        <div className="space-y-3">
                            {notificationFeed.map((n, i) => {
                                const dotColor =
                                    n.type === "success"
                                        ? "bg-[#2BB673]"
                                        : n.type === "warning"
                                        ? "bg-amber-400"
                                        : "bg-blue-400";
                                return (
                                    <div
                                        key={i}
                                        className="flex items-start gap-3 p-3.5 rounded-xl border border-[#EEF2F6] hover:bg-[#F6F8FA] transition-colors"
                                    >
                                        <div className={`h-2.5 w-2.5 rounded-full ${dotColor} mt-1.5 shrink-0`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-[#64748B]">{n.title}</p>
                                            <p className="text-sm text-[#1E293B] mt-0.5 leading-snug">{n.msg}</p>
                                        </div>
                                        <span className="text-[11px] text-[#94A3B8] whitespace-nowrap">{n.time}</span>
                                    </div>
                                );
                            })}
                            {!notificationFeed.length && (
                                <p className="text-xs text-[#94A3B8]">
                                    No recent supplier-related audit events. System activity will show up here.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right — Return tracker */}
                <div className="space-y-5">
                    <div className="bg-white rounded-2xl p-6 border border-amber-100 shadow-[0px_10px_30px_rgba(16,24,40,0.05)]">
                        <div className="flex items-center gap-2.5 mb-5">
                            <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center">
                                <RotateCcw className="h-4 w-4 text-amber-600" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-[#1E293B] text-sm">Return-to-Vendor</h2>
                                <p className="text-xs text-[#94A3B8]">Expiry return windows</p>
                            </div>
                        </div>

                        <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-4xl font-bold text-amber-600">3</span>
                            <span className="text-sm text-[#64748B]">open windows</span>
                        </div>
                        <p className="text-xs text-[#94A3B8] mb-5">Vendors accepting near-expiry returns in the next 30 days.</p>

                        <div className="space-y-3">
                            {returnItems.map((item, i) => (
                                <div key={i} className="bg-amber-50 border border-amber-100 rounded-xl p-3.5">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-semibold text-[#1E293B] text-sm">{item.vendor}</h4>
                                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <AlertCircle className="h-2.5 w-2.5" /> {item.daysLeft}d left
                                        </span>
                                    </div>
                                    <p className="text-xs text-[#64748B] font-medium">{item.item}</p>
                                    <p className="text-xs text-amber-600 mt-1">{item.credit}</p>
                                </div>
                            ))}
                            {!returnItems.length && (
                                <p className="text-xs text-[#94A3B8]">
                                    No near-expiry supplier return windows detected from current stock.
                                </p>
                            )}
                        </div>

                        <button className="mt-5 w-full py-2.5 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 transition-colors shadow-md shadow-amber-600/20">
                            Process Automated Returns
                        </button>
                    </div>

                    {/* Quick Stats */}
                    <div className="bg-white rounded-2xl p-5 border border-[#EEF2F6] shadow-[0px_10px_30px_rgba(16,24,40,0.05)]">
                        <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-4">Supplier Overview</h3>
                        {[
                            { label: "Active Suppliers", value: "12" },
                            { label: "Avg Lead Time", value: "4.2 days" },
                            { label: "On-time Delivery", value: "94.5%" },
                        ].map((stat) => (
                            <div key={stat.label} className="flex items-center justify-between py-2.5 border-b border-[#F6F8FA] last:border-0">
                                <span className="text-sm text-[#64748B]">{stat.label}</span>
                                <span className="font-bold text-[#1E293B] text-sm flex items-center gap-1">
                                    {stat.value} <ArrowUpRight className="h-3.5 w-3.5 text-[#2BB673]" />
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
