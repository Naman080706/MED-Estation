"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, ChevronDown, Settings } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface AlertItem {
    id: number;
    type: string;
    message: string;
    ref_id: string;
    severity: string;
    resolved: boolean;
    created_at: string;
}

interface AuditLedgerItem {
    id: number;
    action: string;
    user_id: string;
    data_payload: string;
    timestamp: string;
    previous_hash?: string | null;
    current_hash: string;
}

type NotificationKind = "critical" | "recent";

interface NotificationItem {
    id: string;
    kind: NotificationKind;
    title: string;
    description: string;
    timestamp: string;
}

type ThemeMode = "light" | "dark" | "system";

interface SearchResultItem {
    entity_type: string;
    id: string;
    title: string;
    subtitle?: string | null;
}

export function TopBar() {
    const router = useRouter();
    const [showMenu, setShowMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
    const [notificationsError, setNotificationsError] = useState<string | null>(null);
    const [showSettingsPanel, setShowSettingsPanel] = useState(false);
    const [theme, setTheme] = useState<ThemeMode>("system");
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [showSearchResults, setShowSearchResults] = useState(false);

    const applyTheme = (mode: ThemeMode) => {
        if (typeof window === "undefined") return;
        const root = window.document.documentElement;
        if (mode === "dark") {
            root.classList.add("dark");
        } else if (mode === "light") {
            root.classList.remove("dark");
        } else {
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            if (prefersDark) {
                root.classList.add("dark");
            } else {
                root.classList.remove("dark");
            }
        }
    };

    useEffect(() => {
        if (typeof window === "undefined") return;
        const stored = window.localStorage.getItem("medestation_theme") as ThemeMode | null;
        const initial: ThemeMode = stored || "light";
        setTheme(initial);
        applyTheme(initial);
    }, []);

    useEffect(() => {
        let cancelled = false;

        const loadNotifications = async () => {
            setIsLoadingNotifications(true);
            setNotificationsError(null);
            try {
                const [alerts, audit] = await Promise.all([
                    apiFetch<AlertItem[]>("/alerts/"),
                    apiFetch<AuditLedgerItem[]>("/reports/audit-log", { params: { limit: 20 } }),
                ]);

                if (cancelled) return;

                const criticalAlerts: NotificationItem[] = alerts
                    .filter((a) => a.severity?.toLowerCase() === "critical")
                    .slice(0, 3)
                    .map((a) => ({
                        id: `critical-${a.id}`,
                        kind: "critical",
                        title: "Critical inventory alert",
                        description: a.message,
                        timestamp: a.created_at,
                    }));

                const recentStockEvents: NotificationItem[] = audit
                    .filter((entry) => entry.action === "STOCK_RECEIVED")
                    .slice(0, 10)
                    .map((entry) => {
                        let payload: any = {};
                        try {
                            payload = JSON.parse(entry.data_payload);
                        } catch {
                            // ignore parse errors, fall back to raw payload
                        }
                        const ndc = payload.drug_ndc || payload.ndc || "Unknown NDC";
                        const batchId = payload.batch_id || "Unknown batch";
                        const qty = payload.quantity;

                        return {
                            id: `recent-${entry.id}`,
                            kind: "recent" as const,
                            title: "New stock batch received",
                            description: qty
                                ? `Batch ${batchId} (${ndc}) · ${qty} units`
                                : `Batch ${batchId} (${ndc}) added`,
                            timestamp: entry.timestamp,
                        };
                    });

                const combined: NotificationItem[] = [];

                // Prefer critical alerts first
                for (const item of criticalAlerts) {
                    if (combined.length >= 3) break;
                    combined.push(item);
                }

                // Fill remaining slots with recent batches
                for (const item of recentStockEvents) {
                    if (combined.length >= 3) break;
                    combined.push(item);
                }

                setNotifications(combined);
            } catch (error) {
                if (!cancelled) {
                    setNotificationsError("Unable to load notifications");
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingNotifications(false);
                }
            }
        };

        loadNotifications();

        return () => {
            cancelled = true;
        };
    }, []);

    const handleLogout = () => {
        if (typeof window !== "undefined") {
            window.localStorage.removeItem("medestation_admin");
        }
        setShowMenu(false);
        router.push("/login");
    };

    const handleThemeChange = (mode: ThemeMode) => {
        setTheme(mode);
        if (typeof window !== "undefined") {
            window.localStorage.setItem("medestation_theme", mode);
        }
        applyTheme(mode);
    };

    const runSearch = async () => {
        const trimmed = searchTerm.trim();
        if (!trimmed) {
            setSearchResults([]);
            setShowSearchResults(false);
            setSearchError(null);
            return;
        }
        setIsSearching(true);
        setSearchError(null);
        try {
            const results = await apiFetch<SearchResultItem[]>("/search", {
                params: { q: trimmed, limit: 8 },
            });
            setSearchResults(results);
            setShowSearchResults(true);
        } catch (err) {
            setSearchError("Unable to search inventory database");
            setSearchResults([]);
            setShowSearchResults(true);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            runSearch();
        } else if (e.key === "Escape") {
            setShowSearchResults(false);
        }
    };

    const handleSearchResultClick = (item: SearchResultItem) => {
        setShowSearchResults(false);
        if (item.entity_type === "drug") {
            router.push(`/inventory?ndc=${encodeURIComponent(item.id)}`);
        } else if (item.entity_type === "batch") {
            router.push(`/inventory?batch=${encodeURIComponent(item.id)}`);
        } else if (item.entity_type === "supplier") {
            router.push(`/supplier?sup_id=${encodeURIComponent(item.id)}`);
        }
    };

    return (
        <header className="flex h-[68px] items-center justify-between bg-white dark:bg-[#020617] border-b border-[#EEF2F6] dark:border-[#1F2933] px-6 gap-4">
            {/* Floating search */}
            <div className="relative flex w-full max-w-sm items-center gap-2 rounded-full bg-[#F6F8FA] dark:bg-[#020617] border border-[#EEF2F6] dark:border-[#1F2933] px-4 py-2.5 focus-within:ring-2 focus-within:ring-[#2BB673]/30 focus-within:border-[#2BB673]/40 transition-all">
                <Search className="h-4 w-4 text-[#94A3B8] dark:text-[#9CA3AF] shrink-0" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                        const value = e.target.value;
                        setSearchTerm(value);
                        if (!value.trim()) {
                            // When search is cleared, hide the dropdown and reset state
                            setShowSearchResults(false);
                            setSearchResults([]);
                            setSearchError(null);
                        }
                    }}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search products, batches, suppliers..."
                    className="bg-transparent text-sm w-full outline-none placeholder:text-[#94A3B8] text-[#1E293B] dark:text-[#F9FAFB]"
                />

                {showSearchResults && (
                    <div className="absolute left-0 top-11 mt-1 w-full rounded-xl bg-white dark:bg-[#020617] shadow-lg shadow-black/5 border border-[#EEF2F6] dark:border-[#1F2933] py-1 z-40">
                        {isSearching && (
                            <p className="px-3 py-2 text-[11px] text-[#94A3B8] dark:text-[#9CA3AF]">
                                Searching database...
                            </p>
                        )}
                        {!isSearching && searchError && (
                            <p className="px-3 py-2 text-[11px] text-[#DC2626]">
                                {searchError}
                            </p>
                        )}
                        {!isSearching && !searchError && searchResults.length === 0 && (
                            <p className="px-3 py-2 text-[11px] text-[#94A3B8] dark:text-[#9CA3AF]">
                                No matches in pharmacy database.
                            </p>
                        )}
                        {!isSearching &&
                            !searchError &&
                            searchResults.map((item) => (
                                <button
                                    key={`${item.entity_type}-${item.id}`}
                                    type="button"
                                    onClick={() => handleSearchResultClick(item)}
                                    className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-[#F8FAFC] dark:hover:bg-[#111827] flex flex-col"
                                >
                                    <span className="font-semibold text-[#0F172A] dark:text-[#F9FAFB]">
                                        {item.title}
                                    </span>
                                    {item.subtitle && (
                                        <span className="text-[#64748B] dark:text-[#9CA3AF]">
                                            {item.subtitle}
                                        </span>
                                    )}
                                </button>
                            ))}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 relative">
                {/* Settings icon */}
                <button
                    type="button"
                    className="relative h-9 w-9 flex items-center justify-center rounded-xl text-[#94A3B8] dark:text-[#9CA3AF] hover:bg-[#F6F8FA] dark:hover:bg-[#111827] hover:text-[#1E293B] dark:hover:text-[#F9FAFB] transition-colors"
                    onClick={() => {
                        setShowSettingsPanel((open) => !open);
                        setShowNotifications(false);
                    }}
                >
                    <Settings className="h-[18px] w-[18px]" />
                </button>

                {/* Notification bell */}
                <button
                    type="button"
                    onClick={() => {
                        setShowNotifications((open) => !open);
                        setShowSettingsPanel(false);
                    }}
                    className="relative h-9 w-9 flex items-center justify-center rounded-xl text-[#94A3B8] dark:text-[#9CA3AF] hover:bg-[#F6F8FA] dark:hover:bg-[#111827] hover:text-[#1E293B] dark:hover:text-[#F9FAFB] transition-colors"
                >
                    <Bell className="h-[18px] w-[18px]" />
                    {notifications.length > 0 && (
                        <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2BB673] opacity-75"></span>
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2BB673]"></span>
                        </span>
                    )}
                </button>

                {showNotifications && (
                    <div className="absolute right-16 top-12 w-80 rounded-xl bg-white shadow-lg shadow-black/5 border border-[#EEF2F6] py-2 z-40">
                        <div className="px-3 pb-2 border-b border-[#F1F5F9]">
                            <p className="text-xs font-semibold text-[#0F172A]">Notifications</p>
                            <p className="text-[11px] text-[#94A3B8]">
                                Last 3 critical or newly added batches
                            </p>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {isLoadingNotifications ? (
                                <p className="px-3 py-3 text-[11px] text-[#94A3B8]">
                                    Loading notifications...
                                </p>
                            ) : notificationsError ? (
                                <p className="px-3 py-3 text-[11px] text-[#DC2626]">
                                    {notificationsError}
                                </p>
                            ) : notifications.length === 0 ? (
                                <p className="px-3 py-3 text-[11px] text-[#94A3B8]">
                                    No recent batches or critical medications.
                                </p>
                            ) : (
                                notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        className="px-3 py-2 flex gap-2 items-start hover:bg-[#F8FAFC] transition-colors"
                                    >
                                        <div
                                            className={`mt-0.5 h-6 w-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold ${
                                                n.kind === "critical"
                                                    ? "bg-red-500"
                                                    : "bg-[#2BB673]"
                                            }`}
                                        >
                                            {n.kind === "critical" ? "!" : "+"}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[12px] font-semibold text-[#0F172A] truncate">
                                                {n.title}
                                            </p>
                                            <p className="text-[11px] text-[#64748B] truncate">
                                                {n.description}
                                            </p>
                                            <p className="text-[10px] text-[#94A3B8] mt-0.5">
                                                {new Date(n.timestamp).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Theme settings panel */}
                {showSettingsPanel && (
                    <div className="absolute right-24 top-12 w-52 rounded-xl bg-white dark:bg-[#020617] shadow-lg shadow-black/5 border border-[#EEF2F6] dark:border-[#1F2933] py-2 z-40">
                        <div className="px-3 pb-2 border-b border-[#F1F5F9]">
                            <p className="text-xs font-semibold text-[#0F172A] dark:text-[#F9FAFB]">Display mode</p>
                            <p className="text-[11px] text-[#94A3B8] dark:text-[#9CA3AF]">
                                Choose light or dark theme
                            </p>
                        </div>
                        <div className="py-1">
                            <button
                                type="button"
                                onClick={() => handleThemeChange("light")}
                                className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#F8FAFC] ${
                                    theme === "light" ? "font-semibold text-[#1E293B]" : "text-[#64748B]"
                                }`}
                            >
                                Light
                            </button>
                            <button
                                type="button"
                                onClick={() => handleThemeChange("dark")}
                                className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#F8FAFC] ${
                                    theme === "dark" ? "font-semibold text-[#1E293B]" : "text-[#64748B]"
                                }`}
                            >
                                Dark
                            </button>
                            <button
                                type="button"
                                onClick={() => handleThemeChange("system")}
                                className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#F8FAFC] ${
                                    theme === "system" ? "font-semibold text-[#1E293B]" : "text-[#64748B]"
                                }`}
                            >
                                System default
                            </button>
                        </div>
                    </div>
                )}

                {/* Divider */}
                <div className="w-px h-6 bg-[#EEF2F6] mx-1" />

                {/* Avatar + name + logout menu */}
                <button
                    type="button"
                    onClick={() => setShowMenu((open) => !open)}
                    className="flex items-center gap-2.5 hover:bg-[#F6F8FA] pl-2 pr-3 py-1.5 rounded-xl transition-colors"
                >
                    <div className="h-8 w-8 rounded-full bg-[#2BB673] flex items-center justify-center text-white text-xs font-bold shrink-0">
                        P
                    </div>
                    <div className="hidden sm:block text-left">
                        <p className="text-[13px] font-semibold text-[#1E293B] leading-none">Pratyusha</p>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5 leading-none">Manager</p>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-[#94A3B8]" />
                </button>

                {showMenu && (
                    <div className="absolute right-0 top-12 w-40 rounded-xl bg-white shadow-lg shadow-black/5 border border-[#EEF2F6] py-1 z-50">
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full text-left px-3 py-2 text-xs text-[#E11D48] hover:bg-[#FEF2F2] font-semibold"
                        >
                            Logout
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}
