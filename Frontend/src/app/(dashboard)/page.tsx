"use client";

import React, { useEffect, useRef, useState } from "react";
import {
    AlertCircle, TrendingDown, ArrowUpRight, FileSpreadsheet,
    PackagePlus, ClipboardList, AlertTriangle, Activity,
    CheckCircle2, Clock, Package, ArrowRight
} from "lucide-react";
import { useRouter } from "next/navigation";
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

interface PatientStats {
    total_patients: number;
    insured_patients: number;
    uninsured_patients: number;
}

export default function CommandDashboard() {
    const router = useRouter();
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [alerts, setAlerts] = useState<AlertItem[]>([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [patientStats, setPatientStats] = useState<PatientStats | null>(null);

    useEffect(() => {
        async function fetchSummary() {
            try {
                const data = await apiFetch<DashboardSummary>("/reports/dashboard-summary");
                setSummary(data);
            } catch (err) {
                console.error("Failed to load dashboard summary", err);
            }
        }
        async function fetchPatientStats() {
            try {
                const data = await apiFetch<PatientStats>("/patients/stats");
                setPatientStats(data);
            } catch (err) {
                console.error("Failed to load patient stats", err);
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
        fetchPatientStats();
        fetchAlerts();
    }, []);

    const totalUnits = summary
        ? summary.safe_stock_units + summary.approaching_expiry_units + summary.critical_units + summary.expired_units
        : 0;
    const totalStock = summary ? (summary.safe_stock_units + summary.approaching_expiry_units + summary.critical_units) : "...";
    const totalValue = summary
        ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(summary.total_inventory_value)
        : "...";
    const actionRequired = summary ? summary.critical_units + summary.expired_units : "...";

    // Normalize inventory value against 2 CR to drive the gauge fill (0–100% → -45° to +135°)
    const maxValueForGauge = 2 * 1e7; // 2 CR in INR
    const valueRatio = summary ? Math.min(1, summary.total_inventory_value / maxValueForGauge) : 0;
    const gaugeAngle = -45 + valueRatio * 180;

    // Build a small distribution chart for stock health (Safe / Approaching / Critical / Expired)
    const safeUnits = summary?.safe_stock_units ?? 0;
    const approachingUnits = summary?.approaching_expiry_units ?? 0;
    const criticalUnits = summary?.critical_units ?? 0;
    const expiredUnits = summary?.expired_units ?? 0;
    const maxBucketUnits = Math.max(safeUnits, approachingUnits, criticalUnits, expiredUnits, 1);
    const stockBuckets = [
        { key: "Safe", value: safeUnits, color: "bg-[#2BB673]" },
        { key: "Approaching", value: approachingUnits, color: "bg-amber-400" },
        { key: "Critical", value: criticalUnits, color: "bg-red-500" },
        { key: "Expired", value: expiredUnits, color: "bg-slate-300" },
    ];

    const now = new Date();
    const formattedDate = now.toLocaleString("en-IN", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleUploadFile: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002/api/v1";
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch(`${base}/upload/dataset`, {
                method: "POST",
                body: formData,
            });
            if (!res.ok) {
                console.error("Upload failed", await res.text());
            }
        } catch (err) {
            console.error("Upload failed", err);
        } finally {
            setUploading(false);
            // Reset input so selecting the same file again still triggers change
            event.target.value = "";
        }
    };

    const handleGoToForecast = () => {
        router.push("/forecast");
    };

    const handleGoToInventory = () => {
        router.push("/inventory");
    };

    const handleGoToReports = () => {
        router.push("/reports");
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-400">

            {/* Store info ribbon */}
            <div className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 overflow-hidden border border-[#2BB673]/20 bg-[#2BB673]/10 dark:bg-[#2BB673]/20"
            >
                <div className="flex items-center gap-2 text-xs sm:text-sm text-[#1E293B] dark:text-white">
                    <span className="font-semibold text-[#1E293B] dark:text-white">PEC Pharmacy</span>
                    <span className="h-1 w-1 rounded-full bg-[#1E293B]/40 dark:bg-white/40 inline-block mx-1" />
                    <span className="text-[#1E293B] dark:text-white">{formattedDate}</span>
                </div>
                <div className="text-[11px] sm:text-xs text-[#1E293B] dark:text-white font-medium">
                    Live MED‑Estation · Inventory & AI Forecast synced
                </div>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#1E293B] dark:text-[#F9FAFB]">MED-Estation Command Center</h1>
                    <p className="text-sm text-[#64748B] dark:text-[#9CA3AF] mt-0.5">Real-time overview of your pharmacy operations</p>
                </div>
                <div className="flex gap-2.5">
                    <button
                        type="button"
                        onClick={handleUploadClick}
                        className="flex items-center gap-2 rounded-xl bg-white dark:bg-[#020617] px-4 py-2.5 text-sm font-medium text-[#1E293B] dark:text-[#F9FAFB] shadow-sm border border-[#EEF2F6] dark:border-[#1F2933] hover:bg-[#F6F8FA] dark:hover:bg-[#111827] transition-colors"
                    >
                        <FileSpreadsheet className="h-4 w-4 text-[#2BB673]" />
                        Upload Excel
                    </button>
                    <button
                        type="button"
                        onClick={handleGoToForecast}
                        className="flex items-center gap-2 rounded-xl bg-[#2BB673] px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-[#2BB673]/20 hover:bg-[#22996A] transition-colors"
                    >
                        <PackagePlus className="h-4 w-4" />
                        Reorder List
                    </button>
                </div>
            </div>

            {/* KPI Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                {/* Inventory Value */}
                <div className="bg-white dark:bg-[#020617] rounded-2xl p-6 border border-[#EEF2F6] dark:border-[#1F2933] shadow-[0px_10px_30px_rgba(16,24,40,0.05)] flex flex-col relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-36 h-36 bg-[#EAF7F1] rounded-full blur-3xl -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
                    <h2 className="text-xs font-semibold text-[#64748B] dark:text-[#9CA3AF] uppercase tracking-wider mb-4">Total Inventory Value</h2>

                    {/* Gauge */}
                    <div className="flex justify-center mb-3">
                        <div className="relative w-36 h-[72px] overflow-hidden">
                            <div className="absolute inset-0 w-36 h-36 rounded-full border-[14px] border-[#EEF2F6] border-b-transparent border-r-transparent transform -rotate-45" />
                            <div
                                className="absolute inset-0 w-36 h-36 rounded-full border-[14px] border-[#2BB673] border-b-transparent border-r-transparent transition-all duration-1000"
                                style={{ transform: `rotate(${gaugeAngle}deg)` }}
                            />
                        </div>
                    </div>

                    <div className="text-center mb-1">
                        <div className="text-3xl font-bold text-[#1E293B] dark:text-[#F9FAFB]">{totalValue}</div>
                        <p className="text-xs text-[#2BB673] font-semibold flex items-center justify-center mt-1 gap-0.5">
                            <ArrowUpRight className="h-3 w-3" /> {summary ? `${Math.round(valueRatio * 100)}% of 2 CR target` : "Live Sync via API"}
                        </p>
                    </div>

                    <div className="flex items-center justify-between text-xs mt-5 pt-4 border-t border-[#EEF2F6] dark:border-[#1F2933]">
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
                <div className="bg-white dark:bg-[#020617] rounded-2xl p-6 border border-[#EEF2F6] dark:border-[#1F2933] shadow-[0px_10px_30px_rgba(16,24,40,0.05)] relative overflow-hidden group">
                    <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-[#EAF7F1] to-transparent opacity-60" />
                    <h2 className="text-xs font-semibold text-[#64748B] dark:text-[#9CA3AF] uppercase tracking-wider mb-3">Units Tracked</h2>
                    <div className="text-5xl font-bold text-[#1E293B] dark:text-[#F9FAFB] mb-3">{totalStock}</div>
                    <div className="flex gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2BB673] bg-[#EAF7F1] px-2.5 py-1 rounded-lg">
                            <ArrowUpRight className="h-3 w-3" /> {summary?.safe_stock_units || 0} healthy
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg">
                            ⚠️ {summary?.approaching_expiry_units || 0} approaching
                        </span>
                    </div>
                    {/* Mini bar chart — distribution of units by health status */}
                    <div className="mt-5">
                        <div className="flex items-end gap-1 h-10">
                            {stockBuckets.map((bucket) => {
                                const heightPercent = bucket.value > 0 ? Math.max(8, (bucket.value / maxBucketUnits) * 100) : 4;
                                return (
                                    <div
                                        key={bucket.key}
                                        className={`flex-1 rounded-t-sm transition-all ${bucket.color}`}
                                        style={{ height: `${heightPercent}%` }}
                                        title={`${bucket.key}: ${bucket.value.toLocaleString()} units`}
                                    />
                                );
                            })}
                        </div>
                        {summary && (
                            <div className="flex justify-between mt-2 text-[10px] text-[#64748B] dark:text-[#9CA3AF]">
                                <span>Safe</span>
                                <span>Approaching</span>
                                <span>Critical</span>
                                <span>Expired</span>
                            </div>
                        )}
                    </div>
                    {patientStats && (
                        <div className="mt-4 text-[11px] text-[#64748B] dark:text-[#9CA3AF]">
                            <span className="font-semibold text-[#1E293B] dark:text-[#F9FAFB]">
                                {patientStats.total_patients}
                            </span>{" "}
                            patients ·{" "}
                            <span className="font-semibold text-[#2BB673]">
                                {patientStats.insured_patients} insured
                            </span>
                        </div>
                    )}
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
                    <button
                        type="button"
                        onClick={() => router.push("/inventory")}
                        className="w-full py-2.5 bg-white text-[#2BB673] rounded-xl font-bold text-sm hover:bg-white/90 transition-colors shadow-lg shadow-black/10"
                    >
                        View Matrix
                    </button>
                </div>
            </div>

            {/* Bottom section — Quick Actions + Activity Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Quick Actions (2/3) */}
                <div className="lg:col-span-2 bg-white dark:bg-[#020617] rounded-2xl p-6 border border-[#EEF2F6] dark:border-[#1F2933] shadow-[0px_10px_30px_rgba(16,24,40,0.05)]">
                    <h2 className="text-sm font-semibold text-[#1E293B] dark:text-[#F9FAFB] mb-4">Quick Actions</h2>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx"
                        className="hidden"
                        onChange={handleUploadFile}
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <button
                            type="button"
                            onClick={handleUploadClick}
                            className="flex flex-col items-center gap-3 p-4 rounded-2xl border border-[#EEF2F6] hover:border-[#2BB673]/30 hover:bg-[#EAF7F1]/30 transition-all group cursor-pointer"
                        >
                            <div className="h-11 w-11 rounded-2xl bg-[#EAF7F1] flex items-center justify-center group-hover:scale-105 transition-transform">
                                <FileSpreadsheet className="h-5 w-5 text-[#2BB673]" />
                            </div>
                            <span className="text-xs font-medium text-[#64748B] text-center leading-snug">
                                {uploading ? "Uploading..." : "Upload Daily Excel"}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={handleGoToForecast}
                            className="flex flex-col items-center gap-3 p-4 rounded-2xl border border-[#EEF2F6] hover:border-[#2BB673]/30 hover:bg-[#EAF7F1]/30 transition-all group cursor-pointer"
                        >
                            <div className="h-11 w-11 rounded-2xl bg-blue-50 flex items-center justify-center group-hover:scale-105 transition-transform">
                                <PackagePlus className="h-5 w-5 text-blue-600" />
                            </div>
                            <span className="text-xs font-medium text-[#64748B] text-center leading-snug">
                                Generate Reorder List
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={handleGoToInventory}
                            className="flex flex-col items-center gap-3 p-4 rounded-2xl border border-[#EEF2F6] hover:border-[#2BB673]/30 hover:bg-[#EAF7F1]/30 transition-all group cursor-pointer"
                        >
                            <div className="h-11 w-11 rounded-2xl bg-amber-50 flex items-center justify-center group-hover:scale-105 transition-transform">
                                <ClipboardList className="h-5 w-5 text-amber-600" />
                            </div>
                            <span className="text-xs font-medium text-[#64748B] text-center leading-snug">
                                View Expiry List
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={handleGoToReports}
                            className="flex flex-col items-center gap-3 p-4 rounded-2xl border border-[#EEF2F6] hover:border-[#2BB673]/30 hover:bg-[#EAF7F1]/30 transition-all group cursor-pointer"
                        >
                            <div className="h-11 w-11 rounded-2xl bg-purple-50 flex items-center justify-center group-hover:scale-105 transition-transform">
                                <Activity className="h-5 w-5 text-purple-600" />
                            </div>
                            <span className="text-xs font-medium text-[#64748B] text-center leading-snug">
                                View Reports
                            </span>
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={() => router.push("/billing")}
                        className="mt-1 w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-dashed border-[#E5E7EB] hover:border-[#111827] hover:bg-[#F9FAFB] transition-colors text-xs sm:text-sm font-medium text-[#111827]"
                    >
                        <span className="inline-flex items-center gap-2">
                            <ArrowRight className="h-3.5 w-3.5 text-[#2BB673]" />
                            <span>Launch Billing & POS</span>
                        </span>
                        <span className="text-[11px] text-[#6B7280]">Connected to live inventory</span>
                    </button>
                </div>

                {/* Recent Activity (1/3) */}
                <div className="bg-white dark:bg-[#020617] rounded-2xl p-6 border border-[#EEF2F6] dark:border-[#1F2933] shadow-[0px_10px_30px_rgba(16,24,40,0.05)]">
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
