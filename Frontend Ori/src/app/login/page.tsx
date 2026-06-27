"use client";

import React, { useState } from "react";
import { Pill, ShieldCheck, ArrowRight, UserCircle2, Briefcase, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [step, setStep] = useState(1);
    const [role, setRole] = useState("manager");
    const [showPw, setShowPw] = useState(false);
    const router = useRouter();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (step === 1) setStep(2);
        else router.push("/");
    };

    return (
        <div className="flex min-h-screen">
            {/* Left panel — soft green illustration */}
            <div className="hidden lg:flex w-[45%] flex-col justify-between px-14 py-12 relative overflow-hidden"
                style={{ background: "linear-gradient(145deg, #EAF7F1 0%, #D1F0E3 60%, #C5EDDB 100%)" }}
            >
                {/* Decorative blobs */}
                <div className="absolute top-[-10%] right-[-15%] w-[60%] h-[60%] rounded-full bg-[#2BB673]/20 blur-[80px]" />
                <div className="absolute bottom-[-5%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#2BB673]/15 blur-[60px]" />

                {/* Logo */}
                <div className="relative flex items-center gap-3 z-10">
                    <div className="h-10 w-10 rounded-xl bg-[#2BB673] flex items-center justify-center shadow-lg shadow-[#2BB673]/25">
                        <Pill className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-bold text-[#1E293B] text-xl tracking-tight">SmartPharma</span>
                </div>

                {/* Main copy */}
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 bg-[#2BB673]/15 text-[#2BB673] text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#2BB673]" />
                        AI-Powered Inventory
                    </div>
                    <h2 className="text-5xl font-extrabold text-[#1E293B] leading-[1.15] mb-5">
                        Intelligent<br />Pharmacy<br />Management.
                    </h2>
                    <p className="text-[#64748B] text-base leading-relaxed max-w-sm">
                        Forecast demand, eliminate wastage, and achieve full supply-chain visibility — all in one platform.
                    </p>

                    {/* Feature pills */}
                    <div className="flex flex-wrap gap-2 mt-8">
                        {["FEFO Tracking", "AI Demand Forecast", "Auto Reorders", "Compliance Reports"].map((tag) => (
                            <span key={tag} className="bg-white/70 backdrop-blur-sm text-[#1E293B] text-xs font-medium px-3 py-1.5 rounded-full border border-white/60 shadow-sm">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Bottom stat */}
                <div className="relative z-10 flex gap-8">
                    {[{ val: "1,200+", label: "Items Tracked" }, { val: "98%", label: "Accuracy Rate" }, { val: "40%", label: "Wastage Reduced" }].map((s) => (
                        <div key={s.label}>
                            <div className="text-2xl font-bold text-[#1E293B]">{s.val}</div>
                            <div className="text-xs text-[#64748B] mt-0.5">{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right panel — form */}
            <div className="flex-1 flex flex-col justify-center items-center px-8 sm:px-12 bg-white">
                <div className="w-full max-w-md space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* Mobile logo */}
                    <div className="flex lg:hidden items-center gap-2 mb-4">
                        <div className="h-8 w-8 rounded-lg bg-[#2BB673] flex items-center justify-center">
                            <Pill className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-bold text-[#1E293B]">SmartPharma</span>
                    </div>

                    <div>
                        <h1 className="text-2xl font-bold text-[#1E293B]">
                            {step === 1 ? "Welcome back 👋" : "Verify your identity"}
                        </h1>
                        <p className="text-[#64748B] mt-1.5 text-sm">
                            {step === 1 ? "Sign in to continue to your dashboard." : "Enter the 6-digit code sent to your registered device."}
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        {step === 1 && (
                            <>
                                {/* Role toggle */}
                                <div>
                                    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">Sign in as</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { id: "manager", icon: Briefcase, label: "Manager" },
                                            { id: "staff", icon: UserCircle2, label: "Staff" },
                                        ].map((r) => (
                                            <button
                                                key={r.id}
                                                type="button"
                                                onClick={() => setRole(r.id)}
                                                className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border-2 transition-all ${role === r.id
                                                    ? "border-[#2BB673] bg-[#EAF7F1] text-[#2BB673]"
                                                    : "border-[#EEF2F6] text-[#94A3B8] hover:border-gray-200"
                                                    }`}
                                            >
                                                <r.icon className="h-4 w-4 shrink-0" />
                                                <span className="text-sm font-semibold">{r.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Fields */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-[#1E293B] mb-1.5">Email Address</label>
                                        <input
                                            type="email"
                                            required
                                            className="w-full px-4 py-3 rounded-2xl border border-[#EEF2F6] bg-[#F6F8FA] text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2BB673]/30 focus:border-[#2BB673]/50 transition-all"
                                            placeholder="name@pharmacy.com"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="block text-sm font-medium text-[#1E293B]">Password</label>
                                            <button type="button" className="text-xs text-[#2BB673] font-medium hover:underline">Forgot password?</button>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type={showPw ? "text" : "password"}
                                                required
                                                className="w-full px-4 py-3 pr-11 rounded-2xl border border-[#EEF2F6] bg-[#F6F8FA] text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2BB673]/30 focus:border-[#2BB673]/50 transition-all"
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPw(!showPw)}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]"
                                            >
                                                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {step === 2 && (
                            <div className="space-y-5">
                                <div className="flex justify-center gap-2.5">
                                    {[1, 2, 3, 4, 5, 6].map((i) => (
                                        <input
                                            key={i}
                                            type="text"
                                            maxLength={1}
                                            className="w-11 h-14 text-center text-xl font-bold rounded-2xl border-2 border-[#EEF2F6] bg-[#F6F8FA] focus:outline-none focus:ring-2 focus:ring-[#2BB673]/30 focus:border-[#2BB673] transition-all text-[#1E293B]"
                                            placeholder="·"
                                        />
                                    ))}
                                </div>
                                <p className="text-center text-sm text-[#64748B] flex items-center justify-center gap-1.5">
                                    <ShieldCheck className="h-4 w-4 text-[#2BB673]" />
                                    MFA Protected — Didn't receive? <button type="button" className="text-[#2BB673] font-medium hover:underline ml-0.5">Resend</button>
                                </p>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full flex items-center justify-center gap-2 bg-[#2BB673] text-white py-3.5 rounded-2xl font-semibold text-sm shadow-lg shadow-[#2BB673]/25 hover:bg-[#22996A] active:scale-[0.99] transition-all duration-200"
                        >
                            {step === 1 ? "Sign In" : "Verify & Continue"}
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </form>

                    <p className="text-center text-xs text-[#94A3B8]">
                        Protected by enterprise-grade encryption · <span className="text-[#2BB673]">SmartPharma v2.0</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
