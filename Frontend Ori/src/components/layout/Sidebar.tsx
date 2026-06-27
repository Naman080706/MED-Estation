"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    PackageSearch,
    LineChart,
    Truck,
    FileText,
    ChevronLeft,
    ChevronRight,
    Pill
} from "lucide-react";

const navItems = [
    { name: "Command Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Inventory Matrix", href: "/inventory", icon: PackageSearch },
    { name: "AI Demand Forecast", href: "/forecast", icon: LineChart },
    { name: "Supplier & Procurement", href: "/supplier", icon: Truck },
    { name: "Waste & Reports", href: "/reports", icon: FileText },
];

export function Sidebar() {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();

    return (
        <aside
            className={`relative bg-white border-r border-[#EEF2F6] text-[#1E293B] transition-all duration-300 ease-in-out h-screen flex flex-col ${isCollapsed ? "w-[72px]" : "w-64"}`}
        >
            {/* Logo */}
            <div className="flex h-[68px] items-center px-5 border-b border-[#EEF2F6]">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF7F1] shrink-0">
                        <Pill className="h-5 w-5 text-[#2BB673]" />
                    </div>
                    {!isCollapsed && (
                        <span className="font-bold text-[#1E293B] text-[15px] tracking-tight">SmartPharma</span>
                    )}
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={isCollapsed ? item.name : undefined}
                            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 group ${isActive
                                ? "bg-[#EAF7F1] text-[#2BB673] font-semibold"
                                : "text-[#64748B] hover:bg-[#F6F8FA] hover:text-[#1E293B]"
                                }`}
                        >
                            <item.icon className={`h-[18px] w-[18px] shrink-0 transition-colors ${isActive ? "text-[#2BB673]" : "text-[#94A3B8] group-hover:text-[#1E293B]"}`} />
                            {!isCollapsed && (
                                <span className="text-sm leading-none">{item.name}</span>
                            )}
                            {isActive && !isCollapsed && (
                                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#2BB673]" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom user hint */}
            {!isCollapsed && (
                <div className="p-4 border-t border-[#EEF2F6]">
                    <div className="flex items-center gap-3 px-2">
                        <div className="h-8 w-8 rounded-full bg-[#EAF7F1] flex items-center justify-center text-[#2BB673] font-bold text-xs shrink-0">
                            SP
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#1E293B] truncate">Sarah (Manager)</p>
                            <p className="text-[11px] text-[#94A3B8] truncate">sarah@pharma.com</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Collapse toggle */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-9 flex h-6 w-6 items-center justify-center rounded-full bg-white border border-[#EEF2F6] text-[#64748B] shadow-sm hover:border-[#2BB673] hover:text-[#2BB673] transition-colors z-10"
            >
                {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
            </button>
        </aside>
    );
}
