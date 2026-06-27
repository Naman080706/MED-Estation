"use client";

import React, { useEffect, useState } from "react";
import {
    AlertCircle, TrendingDown, ArrowUpRight, FileSpreadsheet,
    PackagePlus, ClipboardList, AlertTriangle, Activity,
    CheckCircle2, Clock, Package
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface AlertItem {
    id: number;
    type: string;
    message: string;
    severity: string;
    created_at: string;
}

const quickActions = [
    { icon: FileSpreadsheet, label: "Upload Daily Excel", color: "text-[#2BB673]", bg: "bg-[#EAF7F1]" },
    { icon: PackagePlus, label: "Generate Reorder List", color: "text-blue-600", bg: "bg-blue-50" },
    { icon: ClipboardList, label: "View Expiry List", color: "text-amber-600", bg: "bg-amber-50" },
    { icon: Activity, label: "View Reports", color: "text-purple-600", bg: "bg-purple-50" },
];

interface DashboardSummary {
    total_inventory_value: number;
    safe_stock_units: number;
    approaching_expiry_units: number;
    critical_units: number;
    expired_units: number;
}

export default function CommandDashboard() {
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [alerts, setAlerts] = useState<AlertItem[]>([]);

    useEffect(() => {
        async function fetchSummary() {
            try {
                const data = await apiFetch<DashboardSummary>("/reports/dashboard-summary");
                setSummary(data);
            } catch (err) {
                console.error("Failed to load dashboard summary", err);
            }
        }
        async function fetchAlerts() {
            try {
                const data = await apiFetch<AlertItem[]>("/alerts/");
                setAlerts(data.slice(0, 5)); // Show top 5
            } catch (err) {
                console.error("Failed to load alerts", err);
            }
        }
        fetchSummary();
        fetchAlerts();
    }, []);

    const totalStock = summary ? (summary.safe_stock_units + summary.approaching_expiry_units + summary.critical_units) : "...";
    const totalValue = summary ? `$${summary.total_inventory_value.toLocaleString()}` : "...";
    const actionRequired = summary ? summary.critical_units + summary.expired_units : "...";

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-400">

            {/* Alert ticker */}
            <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 overflow-hidden">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <div className="overflow-hidden flex-1 relative">
                    <div className="whitespace-nowrap text-sm font-medium text-red-700 animate-[slide-left_20s_linear_infinite]">
                        🚨 Real-time API Connection established &nbsp;|&nbsp; ⚠️ Check your critical and expired stock levels below &nbsp;|&nbsp; 📦 Awaiting ML Reorder Generation
                    </div>
                </div>
                <div className="shrink-0">
                    <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded-lg">Live</span>
                </div>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#1E293B]">Command Dashboard</h1>
                    <p className="text-sm text-[#64748B] mt-0.5">Real-time overview of your pharmacy operations</p>
                </div>
                <div className="flex gap-2.5">
                    <button className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-[#1E293B] shadow-sm border border-[#EEF2F6] hover:bg-[#F6F8FA] transition-colors">
                        <FileSpreadsheet className="h-4 w-4 text-[#2BB673]" />
                        Upload Excel
                    </button>
                    <button className="flex items-center gap-2 rounded-xl bg-[#2BB673] px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-[#2BB673]/20 hover:bg-[#22996A] transition-colors">
                        <PackagePlus className="h-4 w-4" />
                        Reorder List
                    </button>
                </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                {/* Inventory Value */}
                <div className="bg-white rounded-2xl p-6 border border-[#EEF2F6] shadow-[0px_10px_30px_rgba(16,24,40,0.05)] flex flex-col relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-36 h-36 bg-[#EAF7F1] rounded-full blur-3xl -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
                    <h2 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-4">Total Inventory Value</h2>

                    {/* Gauge */}
                    <div className="flex justify-center mb-3">
                        <div className="relative w-36 h-[72px] overflow-hidden">
                            <div className="absolute inset-0 w-36 h-36 rounded-full border-[14px] border-[#EEF2F6] border-b-transparent border-r-transparent transform -rotate-45" />
                            <div className="absolute inset-0 w-36 h-36 rounded-full border-[14px] border-[#2BB673] border-b-transparent border-r-transparent transform rotate-[15deg] transition-all duration-1000" />
                        </div>
                    </div>

                    <div className="text-center mb-1">
                        <div className="text-3xl font-bold text-[#1E293B]">{totalValue}</div>
                        <p className="text-xs text-[#2BB673] font-semibold flex items-center justify-center mt-1 gap-0.5">
                            <ArrowUpRight className="h-3 w-3" /> Live Sync via API
                        </p>
                    </div>

                    <div className="flex items-center justify-between text-xs mt-5 pt-4 border-t border-[#EEF2F6]">
                        <div>
                            <span className="block text-[#94A3B8] mb-0.5">Total Wastage</span>
                            <span className="font-bold text-red-500">Analytics Active</span>
                        </div>
                        <div className="text-right">
                            <span className="block text-[#94A3B8] mb-0.5">Prevented Expiry</span>
                            <span className="font-bold text-[#2BB673]">FEFO Active</span>
                        </div>
                    </div>
                </div>

                {/* Items Tracked */}
                <div className="bg-white rounded-2xl p-6 border border-[#EEF2F6] shadow-[0px_10px_30px_rgba(16,24,40,0.05)] relative overflow-hidden group">
                    <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-[#EAF7F1] to-transparent opacity-60" />
                    <h2 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">Units Tracked</h2>
                    <div className="text-5xl font-bold text-[#1E293B] mb-3">{totalStock}</div>
                    <div className="flex gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2BB673] bg-[#EAF7F1] px-2.5 py-1 rounded-lg">
                            <ArrowUpRight className="h-3 w-3" /> {summary?.safe_stock_units || 0} healthy
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg">
                            ⚠️ {summary?.approaching_expiry_units || 0} approaching
                        </span>
                    </div>
                    {/* Mini bar chart */}
                    <div className="flex items-end gap-1 mt-5 h-10">
                        {[65, 80, 55, 90, 72, 95, 88].map((h, i) => (
                            <div key={i} className={`flex-1 rounded-t-sm transition-all ${i === 6 ? "bg-[#2BB673]" : "bg-[#EEF2F6]"}`} style={{ height: `${h}%` }} />
                        ))}
                    </div>
                </div>

                {/* Needs Reorder */}
                <div className="rounded-2xl p-6 shadow-[0px_10px_30px_rgba(16,24,40,0.05)] text-white relative overflow-hidden"
                    style={{ background: "linear-gradient(135deg, #2BB673 0%, #1E9B5E 100%)" }}
                >
                    <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10" />
                    <div className="absolute -right-4 -bottom-8 w-24 h-24 rounded-full bg-white/5" />
                    <h2 className="text-xs font-semibold text-white/80 uppercase tracking-wider mb-3">Critical / Expired</h2>
                    <div className="text-5xl font-bold mb-3">{actionRequired}</div>
                    <div className="flex items-center gap-2 mb-6">
                        <span className="flex items-center text-xs font-semibold bg-white/20 px-2.5 py-1 rounded-lg gap-1">
                            <TrendingDown className="h-3 w-3" /> Action Recommended
                        </span>
                    </div>
                    <button className="w-full py-2.5 bg-white text-[#2BB673] rounded-xl font-bold text-sm hover:bg-white/90 transition-colors shadow-lg shadow-black/10">
                        View Matrix
                    </button>
                </div>
            </div>

            {/* Bottom section — Quick Actions + Activity Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Quick Actions (2/3) */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-[#EEF2F6] shadow-[0px_10px_30px_rgba(16,24,40,0.05)]">
                    <h2 className="text-sm font-semibold text-[#1E293B] mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {quickActions.map((qa) => (
                            <button key={qa.label} className="flex flex-col items-center gap-3 p-4 rounded-2xl border border-[#EEF2F6] hover:border-[#2BB673]/30 hover:bg-[#EAF7F1]/30 transition-all group cursor-pointer">
                                <div className={`h-11 w-11 rounded-2xl ${qa.bg} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                                    <qa.icon className={`h-5 w-5 ${qa.color}`} />
                                </div>
                                <span className="text-xs font-medium text-[#64748B] text-center leading-snug">{qa.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Recent Activity (1/3) */}
                <div className="bg-white rounded-2xl p-6 border border-[#EEF2F6] shadow-[0px_10px_30px_rgba(16,24,40,0.05)]">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-[#1E293B]">Recent Activity</h2>
                        <button className="text-xs text-[#2BB673] font-medium hover:underline">View all</button>
                    </div>
                    <div className="space-y-4">
                        {alerts.length === 0 ? (
                            <p className="text-xs text-[#94A3B8]">No active alerts. System is healthy ✅</p>
                        ) : alerts.map((alert) => {
                            const isCritical = alert.severity === "critical" || alert.severity === "high";
                            const isWarning = alert.severity === "medium";
                            const Icon = isCritical ? AlertTriangle : isWarning ? Clock : Package;
                            const bg = isCritical ? "bg-red-50" : isWarning ? "bg-amber-50" : "bg-blue-50";
                            const color = isCritical ? "text-red-500" : isWarning ? "text-amber-500" : "text-blue-500";
                            const timeAgo = new Date(alert.created_at).toLocaleString();
                            return (
                                <div key={alert.id} className="flex items-start gap-3">
                                    <div className={`h-8 w-8 rounded-xl ${bg} flex items-center justify-center shrink-0 mt-0.5`}>
                                        <Icon className={`h-4 w-4 ${color}`} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-[#1E293B] leading-snug">{alert.message}</p>
                                        <p className="text-[11px] text-[#94A3B8] mt-0.5">{timeAgo}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
