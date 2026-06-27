 "use client";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { X, Send, Sparkles, BotMessageSquare } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Message {
    role: "bot" | "user";
    content: string;
}

export function ChatbotDrawer() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        { role: "bot", content: "Hi! I'm PharmAI 👋 How can I help you manage your inventory today?" },
    ]);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;
        const userText = input;

        setMessages((prev) => [...prev, { role: "user", content: userText }]);
        setInput("");

        // Temporary thinking message
        setMessages((prev) => [
            ...prev,
            { role: "bot", content: "Let me think about that for a second..." },
        ]);

        try {
            const res = await apiFetch<{ reply: string; actions_taken?: any[] }>("/chatbot/query", {
                method: "POST",
                body: JSON.stringify({ message: userText })
            });

            // Overwrite the loading text with response
            setMessages((prev) => {
                const newArr = [...prev];
                newArr[newArr.length - 1] = { role: "bot", content: res.reply };
                return newArr;
            });
        } catch (error) {
            setMessages((prev) => {
                const newArr = [...prev];
                newArr[newArr.length - 1] = { role: "bot", content: "⚠️ Error contacting AI server. Is the backend running?" };
                return newArr;
            });
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
            {/* Drawer */}
            {isOpen && (
                <div className="w-[340px] rounded-2xl overflow-hidden flex flex-col h-[460px] shadow-2xl shadow-black/10 border border-white/60 animate-in slide-in-from-bottom-4 duration-300"
                    style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)" }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3.5 bg-white border-b border-[#EEF2F6]">
                        <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-xl bg-[#EAF7F1] flex items-center justify-center">
                                <Sparkles className="h-4 w-4 text-[#2BB673]" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-[#1E293B] leading-none">MED-Esarthi</p>
                                <p className="text-[11px] text-[#2BB673] mt-0.5 flex items-center gap-1 leading-none">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#2BB673] inline-block" />
                                    Online
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="h-7 w-7 flex items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[#F6F8FA] hover:text-[#1E293B] transition-colors">
                            <X size={15} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                                        msg.role === "bot"
                                            ? "bg-[#EAF7F1] text-[#1E293B] rounded-tl-sm"
                                            : "bg-[#2BB673] text-white rounded-tr-sm"
                                    }`}
                                >
                                    {msg.role === "bot" ? (
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    ) : (
                                        msg.content
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 bg-white border-t border-[#EEF2F6]">
                        <div className="flex items-center gap-2 bg-[#F6F8FA] rounded-xl px-3 py-2 border border-[#EEF2F6] focus-within:border-[#2BB673]/40 focus-within:ring-2 focus-within:ring-[#2BB673]/20 transition-all">
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                type="text"
                                placeholder="Ask about stock, orders..."
                                className="flex-1 bg-transparent text-sm outline-none text-[#1E293B] placeholder:text-[#94A3B8]"
                            />
                            <button
                                onClick={handleSend}
                                className="h-7 w-7 flex items-center justify-center rounded-lg bg-[#2BB673] text-white hover:bg-[#22996A] transition-colors shrink-0"
                            >
                                <Send size={13} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FAB Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex h-13 w-13 h-[52px] w-[52px] items-center justify-center rounded-full bg-[#2BB673] text-white shadow-lg shadow-[#2BB673]/30 hover:bg-[#22996A] transition-all hover:scale-105 active:scale-95"
            >
                {isOpen ? <X size={20} /> : <BotMessageSquare size={20} />}
            </button>
        </div>
    );
}
