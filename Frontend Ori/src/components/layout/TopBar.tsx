"use client";

import React from "react";
import { Search, Bell, ChevronDown, Settings } from "lucide-react";

export function TopBar() {
    return (
        <header className="flex h-[68px] items-center justify-between bg-white border-b border-[#EEF2F6] px-6 gap-4">
            {/* Floating search */}
            <div className="flex w-full max-w-sm items-center gap-2 rounded-full bg-[#F6F8FA] border border-[#EEF2F6] px-4 py-2.5 focus-within:ring-2 focus-within:ring-[#2BB673]/30 focus-within:border-[#2BB673]/40 transition-all">
                <Search className="h-4 w-4 text-[#94A3B8] shrink-0" />
                <input
                    type="text"
                    placeholder="Search products, batches, suppliers..."
                    className="bg-transparent text-sm w-full outline-none placeholder:text-[#94A3B8] text-[#1E293B]"
                />
            </div>

            <div className="flex items-center gap-2">
                {/* Settings icon */}
                <button className="relative h-9 w-9 flex items-center justify-center rounded-xl text-[#94A3B8] hover:bg-[#F6F8FA] hover:text-[#1E293B] transition-colors">
                    <Settings className="h-[18px] w-[18px]" />
                </button>

                {/* Notification bell */}
                <button className="relative h-9 w-9 flex items-center justify-center rounded-xl text-[#94A3B8] hover:bg-[#F6F8FA] hover:text-[#1E293B] transition-colors">
                    <Bell className="h-[18px] w-[18px]" />
                    <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2BB673] opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2BB673]"></span>
                    </span>
                </button>

                {/* Divider */}
                <div className="w-px h-6 bg-[#EEF2F6] mx-1" />

                {/* Avatar + name */}
                <button className="flex items-center gap-2.5 hover:bg-[#F6F8FA] pl-2 pr-3 py-1.5 rounded-xl transition-colors">
                    <div className="h-8 w-8 rounded-full bg-[#2BB673] flex items-center justify-center text-white text-xs font-bold shrink-0">
                        SP
                    </div>
                    <div className="hidden sm:block text-left">
                        <p className="text-[13px] font-semibold text-[#1E293B] leading-none">Sarah P.</p>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5 leading-none">Manager</p>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-[#94A3B8]" />
                </button>
            </div>
        </header>
    );
}
