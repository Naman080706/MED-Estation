"use client";

import React from "react";
import { MessageCircle, CheckCircle2, Clock, AlertCircle, ArrowUpRight, RotateCcw } from "lucide-react";

const purchaseOrders = [
    { name: "PharmaCorp Industries", avatar: "PC", items: 4, value: "$1,250", status: "Awaiting Approval", priority: "High", statusColor: "text-red-600 bg-red-50 border-red-100", priorityColor: "text-red-500" },
    { name: "MediSupply Global", avatar: "MS", items: 12, value: "$8,400", status: "In Review", priority: "Medium", statusColor: "text-amber-600 bg-amber-50 border-amber-100", priorityColor: "text-amber-500" },
    { name: "Local Distributors LLC", avatar: "LD", items: 2, value: "$450", status: "Awaiting Approval", priority: "Low", statusColor: "text-blue-600 bg-blue-50 border-blue-100", priorityColor: "text-[#2BB673]" },
];

const returnItems = [
    { vendor: "MediSupply Global", daysLeft: 12, item: "50 units Amoxicillin", credit: "Return before SLA expires" },
    { vendor: "PharmaCorp", daysLeft: 18, item: "Excess inventory batch", credit: "60% credit refund available" },
    { vendor: "BioHealth Ltd", daysLeft: 25, item: "Insulin Vials (expired)", credit: "Full replacement guaranteed" },
];

const notificationFeed = [
    { vendor: "MediSupply Global", msg: "PO #9201 shipped. Expected delivery: Mar 6, 2026.", type: "success", time: "2h ago" },
    { vendor: "PharmaCorp Ind.", msg: "Price revision notice for Antibiotics category (+3.2%).", type: "warning", time: "5h ago" },
    { vendor: "Local Dist. LLC", msg: "New catalog available. Updated pricing for Q2.", type: "info", time: "Yesterday" },
];

export default function SupplierProcurement() {
    return (
        <div className="max-w-7xl mx-auto space-y-5 animate-in fade-in duration-400">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#1E293B]">Supplier & Procurement</h1>
                    <p className="text-sm text-[#64748B] mt-0.5">Manage vendor relations, PO approvals, and returns</p>
                </div>
                <div className="flex gap-2.5">
                    <button className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-[#1E293B] shadow-sm border border-[#EEF2F6] hover:bg-[#F6F8FA] transition-colors">
                        <MessageCircle className="h-4 w-4 text-[#64748B]" /> Message Vendors
                    </button>
                    <button className="flex items-center gap-2 rounded-xl bg-[#2BB673] px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-[#2BB673]/20 hover:bg-[#22996A] transition-colors">
                        <CheckCircle2 className="h-4 w-4" /> Approve All Pending
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Left — Approval queue + notification feed */}
                <div className="lg:col-span-2 space-y-5">

                    {/* Approval Queue */}
                    <div className="bg-white rounded-2xl p-6 border border-[#EEF2F6] shadow-[0px_10px_30px_rgba(16,24,40,0.05)]">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-semibold text-[#1E293B] flex items-center gap-2">
                                <Clock className="h-4 w-4 text-[#64748B]" /> Reorder Approval Queue
                            </h2>
                            <span className="text-xs font-bold text-white bg-[#2BB673] px-2.5 py-1 rounded-full">3 Pending</span>
                        </div>
                        <div className="space-y-3">
                            {purchaseOrders.map((po, i) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-[#EEF2F6] hover:border-[#2BB673]/30 hover:bg-[#EAF7F1]/20 transition-all cursor-pointer group">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-[#EAF7F1] flex items-center justify-center text-[#2BB673] font-bold text-xs shrink-0">
                                            {po.avatar}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-[#1E293B] text-sm group-hover:text-[#2BB673] transition-colors">{po.name}</h4>
                                            <p className="text-xs text-[#94A3B8] mt-0.5">{po.items} items · <span className={`font-semibold ${po.priorityColor}`}>{po.priority} Priority</span></p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="font-bold text-[#1E293B] text-sm">{po.value}</div>
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${po.statusColor}`}>{po.status}</span>
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
                                const dotColor = n.type === "success" ? "bg-[#2BB673]" : n.type === "warning" ? "bg-amber-400" : "bg-blue-400";
                                return (
                                    <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl border border-[#EEF2F6] hover:bg-[#F6F8FA] transition-colors">
                                        <div className={`h-2.5 w-2.5 rounded-full ${dotColor} mt-1.5 shrink-0`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-[#64748B]">{n.vendor}</p>
                                            <p className="text-sm text-[#1E293B] mt-0.5 leading-snug">{n.msg}</p>
                                        </div>
                                        <span className="text-[11px] text-[#94A3B8] whitespace-nowrap">{n.time}</span>
                                    </div>
                                );
                            })}
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
