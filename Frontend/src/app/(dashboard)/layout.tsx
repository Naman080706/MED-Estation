"use client";


import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { ChatbotDrawer } from "@/components/layout/ChatbotDrawer";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();

    useEffect(() => {
        if (typeof window === "undefined") return;
        const isAdmin = window.localStorage.getItem("medestation_admin") === "true";
        if (!isAdmin) {
            router.replace("/login");
        }
    }, [router]);

    return (
        <div className="flex h-screen bg-[#F6F8FA] dark:bg-[#020617] overflow-hidden text-[#1E293B] dark:text-[#E5E7EB]">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <TopBar />
                <main className="flex-1 overflow-y-auto p-6">
                    {children}
                </main>
            </div>
            <ChatbotDrawer />
        </div>
    );
}
