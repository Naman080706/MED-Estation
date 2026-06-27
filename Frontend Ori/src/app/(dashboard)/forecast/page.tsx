"use client";

import React, { useState } from "react";
import { Calendar, RefreshCcw, TrendingUp, TrendingDown, Minus, BotMessageSquare } from "lucide-react";

const chartData = [42, 58, 48, 75, 62, 88, 72, 95, 110, 88, 125, 140];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const maxVal = Math.max(...chartData);

const reorderSuggestions = [
    { name: "Cough Syrup 100ml", qty: "200 units", trend: "+15%", up: true },
    { name: "Vitamin C 500mg", qty: "150 units", trend: "+8%", up: true },
    { name: "Azithromycin 250mg", qty: "50 units", trend: "+22%", up: true },
    { name: "Metformin 500mg", qty: "80 units", trend: "-3%", up: false },
];

const insightCards = [
    { label: "Peak Demand Month", value: "December", icon: TrendingUp, color: "text-[#2BB673]", bg: "bg-[#EAF7F1]" },
    { label: "Lowest Demand", value: "February", icon: TrendingDown, color: "text-red-500", bg: "bg-red-50" },
    { label: "Avg Monthly Demand", value: "80 units", icon: Minus, color: "text-blue-500", bg: "bg-blue-50" },
];

export default function AIDemandForecast() {
    const [activeTab, setActiveTab] = useState<"historical" | "forecast">("forecast");

    return (
        <div className="max-w-7xl mx-auto space-y-5 animate-in fade-in duration-400">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#1E293B]">AI Demand Forecast</h1>
                    <p className="text-sm text-[#64748B] mt-0.5">Predictive analytics and smart reorder suggestions</p>
                </div>
                <div className="flex gap-2.5">
                    <button className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-[#1E293B] shadow-sm border border-[#EEF2F6] hover:bg-[#F6F8FA] transition-colors">
                        <Calendar className="h-4 w-4 text-[#64748B]" /> This Month
                    </button>
                    <button className="flex items-center gap-2 rounded-xl bg-[#2BB673] px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-[#2BB673]/20 hover:bg-[#22996A] transition-colors">
                        <RefreshCcw className="h-4 w-4" /> Recalculate
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Main Chart */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-[#EEF2F6] shadow-[0px_10px_30px_rgba(16,24,40,0.05)] flex flex-col">

                    {/* Tabs */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex bg-[#F6F8FA] p-1 rounded-xl border border-[#EEF2F6]">
                            {(["historical", "forecast"] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${activeTab === tab ? "bg-white text-[#1E293B] shadow-sm border border-[#EEF2F6]" : "text-[#94A3B8] hover:text-[#64748B]"}`}
                                >
                                    {tab === "forecast" ? "AI Forecast" : "Historical"}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-4 text-xs font-medium text-[#64748B]">
                            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#EEF2F6]" /> Historical</span>
                            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#2BB673]" /> AI Forecast</span>
                        </div>
                    </div>

                    {/* Chart Area */}
                    <div className="flex-1 min-h-[260px] relative">
                        {/* Gradient area + bars */}
                        <div className="absolute inset-0 flex items-end gap-2 px-2 pb-8">
                            {chartData.map((val, i) => {
                                const h = (val / maxVal) * 100;
                                const isForecast = i >= 8;
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group/bar">
                                        <div className="relative w-full flex flex-col items-center justify-end" style={{ height: "220px" }}>
                                            <div
                                                className={`w-full rounded-t-lg transition-all duration-700 ${isForecast ? "bg-gradient-to-t from-[#2BB673] to-[#86EFBB]" : "bg-[#EEF2F6]"}`}
                                                style={{ height: `${h}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-medium text-[#94A3B8]">{months[i]}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* SVG smooth line overlay */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 400 220">
                            <defs>
                                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#2BB673" stopOpacity="0.2" />
                                    <stop offset="100%" stopColor="#2BB673" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <path
                                d="M 15 195 C 45 175, 60 145, 80 155 S 120 105, 145 115 S 195 80, 215 88 S 265 55, 290 45 S 345 15, 385 10"
                                fill="none"
                                stroke="#2BB673"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M 215 88 S 265 55, 290 45 S 345 15, 385 10 V 220 H 215 Z"
                                fill="url(#lineGrad)"
                            />
                        </svg>
                    </div>
                </div>

                {/* Smart Reorder Panel */}
                <div className="rounded-2xl p-6 border border-[#D1F0E3] bg-[#EAF7F1] shadow-[0px_10px_30px_rgba(43,182,115,0.08)] flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="h-7 w-7 rounded-lg bg-[#2BB673] flex items-center justify-center">
                            <BotMessageSquare className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="text-xs font-bold text-[#2BB673] uppercase tracking-wider">AI Suggestion</span>
                    </div>

                    <h2 className="text-lg font-bold text-[#1E293B] mt-3 mb-1">Smart Reorder List</h2>
                    <p className="text-xs text-[#64748B] leading-relaxed mb-5">
                        Based on seasonal trends and active prescription data, reorder these items to prevent stockouts.
                    </p>

                    <div className="flex-1 space-y-3">
                        {reorderSuggestions.map((item, i) => (
                            <div key={i} className="bg-white rounded-xl p-3.5 flex items-center justify-between border border-[#D1F0E3] hover:shadow-sm transition-shadow">
                                <div>
                                    <h4 className="font-semibold text-[#1E293B] text-sm">{item.name}</h4>
                                    <span className="text-xs text-[#64748B]">{item.qty} recommended</span>
                                </div>
                                <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-lg gap-0.5 ${item.up ? "text-[#2BB673] bg-[#EAF7F1]" : "text-red-500 bg-red-50"}`}>
                                    {item.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    {item.trend}
                                </div>
                            </div>
                        ))}
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
                            <p className="text-xs text-[#94A3B8] font-medium">{card.label}</p>
                            <p className="text-lg font-bold text-[#1E293B] mt-0.5">{card.value}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
