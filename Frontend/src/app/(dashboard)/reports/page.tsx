"use client";

import React from "react";
import { Download, FileText, FileSpreadsheet, AlertTriangle, Scale, Search, CheckCircle2, Clock, Info } from "lucide-react";
import { apiFetch } from "@/lib/api";

const reportCards = [
    {
        title: "Expired Stock Report",
        icon: AlertTriangle,
        desc: "All items marked as expired in your current inventory, grouped by batch and vendor.",
        iconColor: "text-red-500",
        iconBg: "bg-red-50",
        countColor: "text-red-600",
    },
    {
        title: "Damaged / Recalled",
        icon: Scale,
        desc: "Compliance-grade records for damaged or recalled inventory lots.",
        iconColor: "text-amber-500",
        iconBg: "bg-amber-50",
        countColor: "text-amber-600",
    },
    {
        title: "Inventory Valuation",
        icon: FileSpreadsheet,
        desc: "Current stock value based on purchase price of active FEFO batches.",
        iconColor: "text-blue-500",
        iconBg: "bg-blue-50",
        countColor: "text-blue-600",
    },
] as const;

const defaultBarData = [
    { label: "Jan", waste: 0, recovered: 0 },
];

interface InventoryBatch {
    id: number;
    batch_id: string;
    quantity: number;
    exp_date: string;
    status: string;
}

interface DashboardSummary {
    total_inventory_value: number;
}

interface AuditLedgerItem {
    id: number;
    action: string;
    user_id: string;
    data_payload: string;
    timestamp: string;
}

interface AuditLogView {
    action: string;
    user: string;
    detail: string;
    time: string;
    type: "success" | "warning" | "info";
}

export default function Reports() {
    const [barData, setBarData] = React.useState(defaultBarData);
    const [expiredCount, setExpiredCount] = React.useState(0);
    const [damagedCount, setDamagedCount] = React.useState(0);
    const [inventoryValue, setInventoryValue] = React.useState<string>("₹0");
    const [auditEntries, setAuditEntries] = React.useState<AuditLogView[]>([]);

    const logIcon = (type: string) => {
        if (type === "success") return { Icon: CheckCircle2, cls: "text-[#2BB673] bg-[#EAF7F1]", dot: "bg-[#2BB673]" };
        if (type === "warning") return { Icon: AlertTriangle, cls: "text-amber-500 bg-amber-50", dot: "bg-amber-400" };
        return { Icon: Info, cls: "text-blue-500 bg-blue-50", dot: "bg-blue-400" };
    };

    React.useEffect(() => {
        async function loadReports() {
            try {
                const [waste, batches, summary, audit] = await Promise.all([
                    apiFetch<any[]>("/reports/waste-heatmap"),
                    apiFetch<InventoryBatch[]>("/inventory/batches"),
                    apiFetch<DashboardSummary>("/reports/dashboard-summary"),
                    apiFetch<AuditLedgerItem[]>("/reports/audit-log", { params: { limit: 8 } }),
                ]);

                // Waste vs Recovery bar data
                if (Array.isArray(waste) && waste.length > 0) {
                    setBarData(
                        waste.slice(0, 8).map((item: any, i: number) => ({
                            label: item.category || `Item ${i + 1}`,
                            waste: Number(item.units_lost) || 0,
                            recovered: 0,
                        }))
                    );
                }

                // Expired and Damaged/Recalled from live batches
                const expired = batches.filter((b) => b.status === "Expired").length;
                const damagedRecalled = batches.filter(
                    (b) => b.status === "Damaged" || b.status === "Recalled"
                ).length;
                setExpiredCount(expired);
                setDamagedCount(damagedRecalled);

                // Inventory valuation from dashboard summary
                const formatter = new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0,
                });
                setInventoryValue(formatter.format(summary.total_inventory_value || 0));

                // Audit log timeline
                const views: AuditLogView[] = audit.map((entry) => {
                    let detail = entry.data_payload;
                    try {
                        const parsed = JSON.parse(entry.data_payload);
                        if (parsed && typeof parsed === "object") {
                            detail = JSON.stringify(parsed);
                        }
                    } catch {
                        // keep raw string
                    }
                    const lower = entry.action.toLowerCase();
                    const type: AuditLogView["type"] =
                        lower.includes("error") || lower.includes("damaged") || lower.includes("expired")
                            ? "warning"
                            : lower.includes("stock") || lower.includes("po_") || lower.includes("stock_received")
                            ? "success"
                            : "info";

                    const time = new Date(entry.timestamp).toLocaleString("en-IN", {
                        month: "short",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                    });

                    return {
                        action: entry.action,
                        user: entry.user_id,
                        detail,
                        time,
                        type,
                    };
                });
                setAuditEntries(views);
            } catch (err) {
                console.error("Reports data load error:", err);
            }
        }
        void loadReports();
    }, []);

    return (
        <div className="max-w-7xl mx-auto space-y-5 animate-in fade-in duration-400">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#1E293B] dark:text-[#F9FAFB]">
                        Waste & Compliance Reports
                    </h1>
                    <p className="text-sm text-[#64748B] dark:text-[#9CA3AF] mt-0.5">
                        Audit logs, scheduled exports, and visual analytics
                    </p>
                </div>
                <div className="flex gap-2.5">
                    <button className="flex items-center gap-2 rounded-xl bg-white dark:bg-[#020617] px-4 py-2.5 text-sm font-medium text-[#1E293B] dark:text-[#F9FAFB] shadow-sm border border-[#EEF2F6] dark:border-[#1F2933] hover:bg-[#F6F8FA] dark:hover:bg-[#111827] transition-colors">
                        <Search className="h-4 w-4 text-[#64748B] dark:text-[#9CA3AF]" /> Search Logs
                    </button>
                    <button className="flex items-center gap-2 rounded-xl border-2 border-[#2BB673] px-4 py-2.5 text-sm font-semibold text-[#2BB673] hover:bg-[#EAF7F1] dark:hover:bg-[#134E4A] transition-colors">
                        <Download className="h-4 w-4" /> Export Monthly
                    </button>
                </div>
            </div>

            {/* Report Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {reportCards.map((card) => (
                    <div
                        key={card.title}
                        className="bg-white dark:bg-[#020617] rounded-2xl p-6 border border-[#EEF2F6] dark:border-[#1F2933] shadow-[0px_10px_30px_rgba(16,24,40,0.05)] hover:shadow-md hover:border-[#2BB673]/20 transition-all group overflow-hidden relative cursor-pointer"
                    >
                        <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full opacity-30 group-hover:scale-150 transition-transform duration-500" style={{ background: card.iconBg.replace("bg-", "") }} />
                        <div className="relative z-10">
                            <div
                                className={`h-12 w-12 rounded-2xl ${card.iconBg} flex items-center justify-center mb-4`}
                            >
                                <card.icon className={`h-6 w-6 ${card.iconColor}`} />
                            </div>
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="font-bold text-[#1E293B] dark:text-[#F9FAFB] text-sm">
                                    {card.title}
                                </h3>
                                <span className={`text-sm font-bold ${card.countColor}`}>
                                    {card.title === "Expired Stock Report"
                                        ? `${expiredCount} items`
                                        : card.title === "Damaged / Recalled"
                                        ? `${damagedCount} records`
                                        : inventoryValue}
                                </span>
                            </div>
                            <p className="text-xs text-[#64748B] dark:text-[#9CA3AF] leading-relaxed mb-5">
                                {card.desc}
                            </p>
                            <div className="flex gap-2">
                                <button className="flex-1 flex items-center justify-center gap-1.5 py-2 border-2 border-[#EEF2F6] text-[#64748B] rounded-xl text-xs font-semibold hover:border-[#2BB673] hover:text-[#2BB673] transition-all">
                                    <FileText className="h-3.5 w-3.5" /> PDF
                                </button>
                                <button className="flex-1 flex items-center justify-center gap-1.5 py-2 border-2 border-[#EEF2F6] text-[#64748B] rounded-xl text-xs font-semibold hover:border-[#2BB673] hover:text-[#2BB673] transition-all">
                                    <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Chart + Timeline grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

                {/* Bar Chart (2/5) */}
                <div className="lg:col-span-2 bg-white dark:bg-[#020617] rounded-2xl p-6 border border-[#EEF2F6] dark:border-[#1F2933] shadow-[0px_10px_30px_rgba(16,24,40,0.05)]">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-sm font-semibold text-[#1E293B] dark:text-[#F9FAFB]">
                            Waste vs Recovery
                        </h2>
                        <div className="flex items-center gap-3 text-[10px] font-semibold text-[#94A3B8] dark:text-[#9CA3AF]">
                            <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded bg-red-300 inline-block" />
                                Waste
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded bg-[#2BB673] inline-block" />
                                Recovered
                            </span>
                        </div>
                    </div>
                    <div className="flex items-end gap-3 h-40">
                        {barData.map((d) => (
                            <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5">
                                <div className="w-full flex flex-col gap-0.5 justify-end" style={{ height: "130px" }}>
                                    <div className="w-full rounded-lg bg-[#2BB673]/80 transition-all" style={{ height: `${d.recovered * 1.1}px` }} />
                                    <div className="w-full rounded-lg bg-red-300 transition-all" style={{ height: `${d.waste * 0.9}px` }} />
                                </div>
                                <span className="text-[10px] text-[#94A3B8] dark:text-[#9CA3AF] font-medium">
                                    {d.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Audit Log Timeline (3/5) */}
                <div className="lg:col-span-3 bg-white dark:bg-[#020617] rounded-2xl p-6 border border-[#EEF2F6] dark:border-[#1F2933] shadow-[0px_10px_30px_rgba(16,24,40,0.05)]">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-sm font-semibold text-[#1E293B] dark:text-[#F9FAFB] flex items-center gap-2">
                            <FileText className="h-4 w-4 text-[#64748B] dark:text-[#9CA3AF]" /> Audit Log
                        </h2>
                        <button className="text-xs text-[#2BB673] font-semibold hover:underline">View all</button>
                    </div>

                    <div className="relative border-l-2 border-[#EEF2F6] dark:border-[#1F2933] ml-4 space-y-6">
                        {auditEntries.map((log, i) => {
                            const { Icon, cls } = logIcon(log.type);
                            return (
                                <div key={i} className="relative pl-6">
                                    <div className={`absolute -left-[13px] top-0.5 h-6 w-6 rounded-full ${cls} flex items-center justify-center border-2 border-white`}>
                                        <Icon className="h-3 w-3" />
                                    </div>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <h4 className="font-semibold text-[#1E293B] dark:text-[#F9FAFB] text-sm">
                                                {log.action}
                                            </h4>
                                            <p className="text-xs font-medium text-[#64748B] dark:text-[#9CA3AF] mt-0.5">
                                                {log.user}
                                            </p>
                                            <p className="text-xs text-[#94A3B8] dark:text-[#9CA3AF] mt-1.5 bg-[#F6F8FA] dark:bg-[#020617] border border-[#EEF2F6] dark:border-[#1F2933] px-3 py-1.5 rounded-xl leading-relaxed inline-block">
                                                {log.detail}
                                            </p>
                                        </div>
                                        <span className="text-[11px] text-[#94A3B8] dark:text-[#9CA3AF] whitespace-nowrap mt-0.5">
                                            {log.time}
                                        </span>
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
