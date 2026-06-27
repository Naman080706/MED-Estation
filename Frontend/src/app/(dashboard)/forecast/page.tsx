"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Calendar, RefreshCcw, TrendingUp, TrendingDown, Minus, BotMessageSquare } from "lucide-react";
import { apiFetch } from "@/lib/api";

const initialChartData = [42, 58, 48, 75, 62, 88, 72, 95, 110, 88, 125, 140];
const initialMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const insightCards = [
    { label: "Peak Demand Month", value: "December", icon: TrendingUp, color: "text-[#2BB673]", bg: "bg-[#EAF7F1]" },
    { label: "Lowest Demand", value: "February", icon: TrendingDown, color: "text-red-500", bg: "bg-red-50" },
    { label: "Avg Monthly Demand", value: "80 units", icon: Minus, color: "text-blue-500", bg: "bg-blue-50" },
];

interface SalesTrendPoint {
    date: string;
    units_sold: number;
}

interface BackendReorderSuggestion {
    ndc: string;
    drug_name: string;
    current_stock: number;
    predicted_30d_demand: number;
    suggested_reorder_qty: number;
    supplier_id: number;
}

interface ReorderSuggestion {
    name: string;
    qty: string;
    trend: string;
    up: boolean;
}

export default function AIDemandForecast() {
    const [activeTab, setActiveTab] = useState<"historical" | "forecast">("forecast");
    const [chartData, setChartData] = useState<number[]>(initialChartData);
    const [months, setMonths] = useState<string[]>(initialMonths);
    const [reorderSuggestions, setReorderSuggestions] = useState<ReorderSuggestion[]>([]);
    const [loading, setLoading] = useState(true);

    const maxVal = chartData.length ? Math.max(...chartData) : 0;

    const linePoints = useMemo(() => {
        if (!chartData.length || !maxVal) return "";
        const width = 400;
        const height = 220;
        const paddingX = 20;
        const paddingY = 20;
        const innerWidth = width - paddingX * 2;
        const innerHeight = height - paddingY * 2;

        return chartData
            .map((val, index) => {
                const x =
                    paddingX +
                    (innerWidth * index) / Math.max(chartData.length - 1, 1);
                const y =
                    height - paddingY - (val / maxVal) * innerHeight;
                return `${x},${y}`;
            })
            .join(" ");
    }, [chartData, maxVal]);

    async function load(days: number) {
        setLoading(true);
        try {
            // 1) Sales trends → monthly buckets for the chart
            const sales = await apiFetch<SalesTrendPoint[]>("/reports/sales-trends", { params: { days } });
            if (sales.length > 0) {
                const monthBuckets: Record<string, number> = {};
                for (const s of sales) {
                    const d = new Date(s.date);
                    const key = d.toLocaleString("en-US", { month: "short" });
                    monthBuckets[key] = (monthBuckets[key] || 0) + s.units_sold;
                }
                const ordered = initialMonths.filter((m) => monthBuckets[m] !== undefined);
                if (ordered.length) {
                    setMonths(ordered);
                    setChartData(ordered.map((m) => monthBuckets[m]));
                } else {
                    setMonths(initialMonths);
                    setChartData(initialChartData);
                }
            } else {
                setMonths(initialMonths);
                setChartData(initialChartData);
            }

            // 2) Predictive reorder suggestions
            const raw = await apiFetch<BackendReorderSuggestion[]>("/reports/reorder-suggestions");
            if (raw.length) {
                const mapped: ReorderSuggestion[] = raw.slice(0, 6).map((s) => {
                    const deficit = s.predicted_30d_demand - s.current_stock;
                    const up = deficit > 0;
                    const pct = s.current_stock
                        ? Math.round((deficit / s.current_stock) * 100)
                        : 100;
                    return {
                        name: s.drug_name,
                        qty: `${s.suggested_reorder_qty} units`,
                        trend: `${pct > 0 ? "+" : ""}${pct}%`,
                        up,
                    };
                });
                setReorderSuggestions(mapped);
            } else {
                setReorderSuggestions([]);
            }
        } catch (err) {
            console.error("Failed to load AI forecast data", err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        // Default view: last 12 months
        void load(365);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleThisMonth = () => {
        void load(30);
    };

    const handleRecalculate = () => {
        void load(365);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-5 animate-in fade-in duration-400">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-text-primary">AI Demand Forecast</h1>
                    <p className="text-sm text-text-muted mt-0.5">Predictive analytics and smart reorder suggestions</p>
                </div>
                <div className="flex gap-2.5">
                    <button
                        onClick={handleThisMonth}
                        className="flex items-center gap-2 rounded-xl bg-white dark:bg-[#020617] px-4 py-2.5 text-sm font-medium text-text-primary shadow-sm border border-[#EEF2F6] dark:border-[#1F2933] hover:bg-[#F6F8FA] dark:hover:bg-[#111827] transition-colors"
                    >
                        <Calendar className="h-4 w-4 text-text-muted" /> This Month
                    </button>
                    <button
                        onClick={handleRecalculate}
                        className="flex items-center gap-2 rounded-xl bg-[#2BB673] px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-[#2BB673]/20 hover:bg-[#22996A] transition-colors"
                    >
                        <RefreshCcw className="h-4 w-4" /> Recalculate
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Main Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-[#020617] rounded-2xl p-6 border border-[#EEF2F6] dark:border-[#1F2933] shadow-[0px_10px_30px_rgba(16,24,40,0.05)] flex flex-col">

                    {/* Tabs */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex bg-[#F6F8FA] p-1 rounded-xl border border-[#EEF2F6]">
                            {(["historical", "forecast"] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${activeTab === tab ? "bg-white text-text-primary shadow-sm border border-[#EEF2F6]" : "text-text-muted hover:text-text-primary"}`}
                                >
                                    {tab === "forecast" ? "AI Forecast" : "Historical"}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-4 text-xs font-medium text-text-muted">
                            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#EEF2F6] dark:bg-[#1F2933]" /> Historical</span>
                            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#2BB673]" /> AI Forecast</span>
                        </div>
                    </div>

                    {/* Chart Area */}
                    <div className="flex-1 min-h-[260px] relative">
                        {/* Gradient area + bars */}
                        <div className="absolute inset-0 flex items-end gap-2 px-2 pb-8">
                            {chartData.map((val, i) => {
                                const h = maxVal ? (val / maxVal) * 100 : 0;
                                const isForecast = activeTab === "forecast" && i >= Math.max(0, chartData.length - 4);
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group/bar">
                                        <div className="relative w-full flex flex-col items-center justify-end" style={{ height: "220px" }}>
                                            <div
                                                className={`w-full rounded-t-lg transition-all duration-700 ${isForecast ? "bg-gradient-to-t from-[#2BB673] to-[#86EFBB]" : "bg-[#EEF2F6]"}`}
                                                style={{ height: `${h}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-medium text-text-muted">{months[i] ?? ""}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* SVG line overlay driven by real chart data */}
                        <svg
                            className="absolute inset-0 w-full h-full pointer-events-none"
                            preserveAspectRatio="none"
                            viewBox="0 0 400 220"
                        >
                            {linePoints && (
                                <polyline
                                    points={linePoints}
                                    fill="none"
                                    stroke="#2BB673"
                                    strokeWidth={2.5}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            )}
                        </svg>
                    </div>
                </div>

                {/* Smart Reorder Panel */}
                <div className="rounded-2xl p-6 border border-[#D1F0E3] dark:border-[#134E4A] bg-[#EAF7F1] dark:bg-[#022C22] shadow-[0px_10px_30px_rgba(43,182,115,0.08)] flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="h-7 w-7 rounded-lg bg-[#2BB673] flex items-center justify-center">
                            <BotMessageSquare className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="text-xs font-bold text-[#2BB673] uppercase tracking-wider">AI Suggestion</span>
                    </div>

                    <h2 className="text-lg font-bold text-text-primary mt-3 mb-1">Smart Reorder List</h2>
                    <p className="text-xs text-text-muted leading-relaxed mb-5">
                        Based on seasonal trends and active prescription data, reorder these items to prevent stockouts.
                    </p>

                    <div className="flex-1 space-y-3">
                        {reorderSuggestions.map((item, i) => (
                            <div key={i} className="bg-white dark:bg-[#020617] rounded-xl p-3.5 flex items-center justify-between border border-[#D1F0E3] dark:border-[#134E4A] hover:shadow-sm transition-shadow">
                                <div>
                                    <h4 className="font-semibold text-text-primary text-sm">{item.name}</h4>
                                    <span className="text-xs text-text-muted">{item.qty} recommended</span>
                                </div>
                                <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-lg gap-0.5 ${item.up ? "text-[#2BB673] bg-[#EAF7F1]" : "text-red-500 bg-red-50"}`}>
                                    {item.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    {item.trend}
                                </div>
                            </div>
                        ))}
                        {!loading && reorderSuggestions.length === 0 && (
                            <p className="text-xs text-text-muted bg-white rounded-xl border border-[#D1F0E3] px-3 py-3">
                                Not enough historical sales data yet for AI reorder suggestions. Seed more prescriptions or upload a dataset to activate this panel.
                            </p>
                        )}
                    </div>

                    <button className="mt-5 w-full py-3 bg-[#2BB673] text-white rounded-xl font-bold text-sm hover:bg-[#22996A] transition-colors shadow-lg shadow-[#2BB673]/25">
                        Approve All Recommendations
                    </button>
                </div>
            </div>

            {/* Insight cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {insightCards.map((card) => (
                    <div key={card.label} className="bg-white rounded-2xl p-5 border border-[#EEF2F6] shadow-[0px_10px_30px_rgba(16,24,40,0.05)] flex items-center gap-4">
                        <div className={`h-11 w-11 rounded-2xl ${card.bg} flex items-center justify-center shrink-0`}>
                            <card.icon className={`h-5 w-5 ${card.color}`} />
                        </div>
                        <div>
                            <p className="text-xs text-text-muted font-medium">{card.label}</p>
                            <p className="text-lg font-bold text-text-primary mt-0.5">{card.value}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
