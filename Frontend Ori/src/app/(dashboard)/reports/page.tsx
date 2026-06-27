"use client";

import React from "react";
import { Download, FileText, FileSpreadsheet, AlertTriangle, Scale, Search, CheckCircle2, Clock, Info } from "lucide-react";

const reportCards = [
    {
        title: "Expired Stock Report",
        icon: AlertTriangle,
        desc: "All items expired in the last 30 days, categorized by batch and vendor.",
        iconColor: "text-red-500",
        iconBg: "bg-red-50",
        count: "12 items",
        countColor: "text-red-600",
    },
    {
        title: "Damaged / Recalled",
        icon: Scale,
        desc: "Mandatory compliance records for pharmaceutical authority submission.",
        iconColor: "text-amber-500",
        iconBg: "bg-amber-50",
        count: "5 records",
        countColor: "text-amber-600",
    },
    {
        title: "Inventory Valuation",
        icon: FileSpreadsheet,
        desc: "Current stock value vs historical variance and reorder cost analysis.",
        iconColor: "text-blue-500",
        iconBg: "bg-blue-50",
        count: "$248,400",
        countColor: "text-blue-600",
    },
];

const auditLogs = [
    {
        action: "Stock Adjusted",
        user: "Sarah Jenkins (Manager)",
        detail: "Reduced Paracetamol 500mg by -5 units. Reason: Damaged vial.",
        time: "10 mins ago",
        type: "warning",
    },
    {
        action: "PO Approved",
        user: "Automated System",
        detail: "PO #9201 approved for MediSupply Global. $8,400 committed.",
        time: "2 hours ago",
        type: "success",
    },
    {
        action: "Compliance Report Generated",
        user: "Dr. Alistair (Owner)",
        detail: "Monthly Wastage Report generated and digitally signed.",
        time: "Yesterday, 14:30",
        type: "info",
    },
    {
        action: "New Batch Added",
        user: "Ravi Kumar (Staff)",
        detail: "Added Ibuprofen 400mg Batch IBU-99Z — 890 units. Expiry: 2025-08-30.",
        time: "2 days ago",
        type: "success",
    },
];

// Initial default static dataset rendering before hydration
const defaultBarData = [
    { label: "Jan", waste: 0, recovered: 0 },
];

export default function Reports() {
    const [barData, setBarData] = React.useState(defaultBarData);

    const logIcon = (type: string) => {
        if (type === "success") return { Icon: CheckCircle2, cls: "text-[#2BB673] bg-[#EAF7F1]", dot: "bg-[#2BB673]" };
        if (type === "warning") return { Icon: AlertTriangle, cls: "text-amber-500 bg-amber-50", dot: "bg-amber-400" };
        return { Icon: Info, cls: "text-blue-500 bg-blue-50", dot: "bg-blue-400" };
    };

    React.useEffect(() => {
        // Fetch API Heatmap Array Data 
        async function fetchHeatmap() {
            try {
                // apiFetch abstracts `http://localhost:8000/api/v1`
                const res = await fetch("http://localhost:8000/api/v1/reports/waste-heatmap");
                const data = await res.json();

                // Assuming `/reports/waste-heatmap` returns {"waste_trend": [ {month, wastage_value, savings_value} ]}
                if (data && data.waste_trend) {
                    setBarData(data.waste_trend.map((item: any) => ({
                        label: item.month,
                        waste: item.wastage_value,
                        recovered: item.savings_value
                    })));
                }
            } catch (err) {
                console.error("Heatmap fetch error:", err);
            }
        }
        fetchHeatmap();
    }, []);

    return (
        <div className="max-w-7xl mx-auto space-y-5 animate-in fade-in duration-400">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#1E293B]">Waste & Compliance Reports</h1>
                    <p className="text-sm text-[#64748B] mt-0.5">Audit logs, scheduled exports, and visual analytics</p>
                </div>
                <div className="flex gap-2.5">
                    <button className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-[#1E293B] shadow-sm border border-[#EEF2F6] hover:bg-[#F6F8FA] transition-colors">
                        <Search className="h-4 w-4 text-[#64748B]" /> Search Logs
                    </button>
                    <button className="flex items-center gap-2 rounded-xl border-2 border-[#2BB673] px-4 py-2.5 text-sm font-semibold text-[#2BB673] hover:bg-[#EAF7F1] transition-colors">
                        <Download className="h-4 w-4" /> Export Monthly
                    </button>
                </div>
            </div>

            {/* Report Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {reportCards.map((card) => (
                    <div key={card.title} className="bg-white rounded-2xl p-6 border border-[#EEF2F6] shadow-[0px_10px_30px_rgba(16,24,40,0.05)] hover:shadow-md hover:border-[#2BB673]/20 transition-all group overflow-hidden relative cursor-pointer">
                        <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full opacity-30 group-hover:scale-150 transition-transform duration-500" style={{ background: card.iconBg.replace("bg-", "") }} />
                        <div className="relative z-10">
                            <div className={`h-12 w-12 rounded-2xl ${card.iconBg} flex items-center justify-center mb-4`}>
                                <card.icon className={`h-6 w-6 ${card.iconColor}`} />
                            </div>
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="font-bold text-[#1E293B] text-sm">{card.title}</h3>
                                <span className={`text-sm font-bold ${card.countColor}`}>{card.count}</span>
                            </div>
                            <p className="text-xs text-[#64748B] leading-relaxed mb-5">{card.desc}</p>
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
                <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-[#EEF2F6] shadow-[0px_10px_30px_rgba(16,24,40,0.05)]">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-sm font-semibold text-[#1E293B]">Waste vs Recovery</h2>
                        <div className="flex items-center gap-3 text-[10px] font-semibold text-[#94A3B8]">
                            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-red-300 inline-block" />Waste</span>
                            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-[#2BB673] inline-block" />Recovered</span>
                        </div>
                    </div>
                    <div className="flex items-end gap-3 h-40">
                        {barData.map((d) => (
                            <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5">
                                <div className="w-full flex flex-col gap-0.5 justify-end" style={{ height: "130px" }}>
                                    <div className="w-full rounded-lg bg-[#2BB673]/80 transition-all" style={{ height: `${d.recovered * 1.1}px` }} />
                                    <div className="w-full rounded-lg bg-red-300 transition-all" style={{ height: `${d.waste * 0.9}px` }} />
                                </div>
                                <span className="text-[10px] text-[#94A3B8] font-medium">{d.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Audit Log Timeline (3/5) */}
                <div className="lg:col-span-3 bg-white rounded-2xl p-6 border border-[#EEF2F6] shadow-[0px_10px_30px_rgba(16,24,40,0.05)]">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-sm font-semibold text-[#1E293B] flex items-center gap-2">
                            <FileText className="h-4 w-4 text-[#64748B]" /> Audit Log
                        </h2>
                        <button className="text-xs text-[#2BB673] font-semibold hover:underline">View all</button>
                    </div>

                    <div className="relative border-l-2 border-[#EEF2F6] ml-4 space-y-6">
                        {auditLogs.map((log, i) => {
                            const { Icon, cls, dot } = logIcon(log.type);
                            return (
                                <div key={i} className="relative pl-6">
                                    <div className={`absolute -left-[13px] top-0.5 h-6 w-6 rounded-full ${cls} flex items-center justify-center border-2 border-white`}>
                                        <Icon className="h-3 w-3" />
                                    </div>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <h4 className="font-semibold text-[#1E293B] text-sm">{log.action}</h4>
                                            <p className="text-xs font-medium text-[#64748B] mt-0.5">{log.user}</p>
                                            <p className="text-xs text-[#94A3B8] mt-1.5 bg-[#F6F8FA] border border-[#EEF2F6] px-3 py-1.5 rounded-xl leading-relaxed inline-block">
                                                {log.detail}
                                            </p>
                                        </div>
                                        <span className="text-[11px] text-[#94A3B8] whitespace-nowrap mt-0.5">{log.time}</span>
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
