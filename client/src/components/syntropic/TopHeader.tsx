"use client";

import React, { useState, useEffect } from "react";
import {
  ChevronDown,
  Share2,
  LogOut,
  Sparkles,
  Sun,
  Moon,
  ShieldCheck,
  Check
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";

interface TopHeaderProps {
  currentModel: string;
  onModelChange: (model: string) => void;
  onExport: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentModel,
  onModelChange,
  onExport
}) => {
  const { data: session } = useSession();
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check initial dark mode state
    if (document.documentElement.classList.contains("dark")) {
      setIsDarkMode(true);
    }
  }, []);

  const toggleDarkMode = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const userName = session?.user?.name || session?.user?.email?.split("@")[0] || "User";
  const userInitial = userName.charAt(0).toUpperCase() || "U";

  // const models = [
  //   {
  //     id: "ChatHuggingFace (Llama-3-8B)",
  //     title: "ChatHuggingFace (Llama-3-8B)",
  //     subtitle: "meta-llama/Meta-Llama-3-8B-Instruct",
  //     tag: "FREE",
  //     tagColor: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
  //   },
  //   {
  //     id: "Syntropic-4o Analytics (GPT-4o)",
  //     title: "Syntropic-4o Analytics (GPT-4o)",
  //     subtitle: "OpenAI LangGraph Pipeline",
  //     tag: "PRO",
  //     tagColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
  //   }
  // ];

  return (
    <header className="h-14 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-[#E5EBF2] dark:border-zinc-800 px-4 sm:px-6 flex items-center justify-between text-xs select-none sticky top-0 z-30">
      {/* 1. Left: Model Selector & Agent Status */}
      <div className="flex items-center gap-3">
        {/* Model Selector Dropdown */}
        {/* <div className="relative">
          <button
            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#F5F7FB] dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800/80 border border-[#E5EBF2] dark:border-zinc-800 rounded-xl text-[#19213D] dark:text-slate-200 font-semibold transition-all shadow-2xs"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <span className="truncate max-w-[170px] sm:max-w-none">{currentModel}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button> */}

        {/* {modelDropdownOpen && (
            <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-zinc-900 border border-[#E5EBF2] dark:border-zinc-800 rounded-2xl shadow-xl p-2 z-50 space-y-1 animate-in fade-in zoom-in-95">
              <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Select Inference Model
              </div>
              {models.map((m) => {
                const isSelected = currentModel === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      onModelChange(m.id);
                      setModelDropdownOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium shadow-xs"
                        : "hover:bg-[#F5F7FB] dark:hover:bg-zinc-800 text-[#19213D] dark:text-slate-200"
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>{m.title}</span>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <div className={`text-[10px] ${isSelected ? "text-emerald-100" : "text-slate-400"}`}>
                        {m.subtitle}
                      </div>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold ${isSelected ? "bg-white/20 text-white" : m.tagColor}`}>
                      {m.tag}
                    </span>
                  </button>
                );
              })}
            </div>
          )} */}
        {/* </div> */}

        {/* Multi-Agent Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-900 border border-[#E5EBF2] dark:border-zinc-800 text-slate-500 text-[11px]">
          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
          <span>Multi-Agent Engine</span>
          <span>&bull;</span>
          <span className="font-medium text-[#19213D] dark:text-slate-300">Cleaner &bull; Analyst &bull; Visualizer</span>
        </div>
      </div>

      {/* 2. Right: Theme Toggle & User Account */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Dark Mode Switcher */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-xl border border-[#E5EBF2] dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-400 transition-colors shadow-2xs"
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {session?.user && (
          <div className="flex items-center gap-2.5 pl-2 border-l border-[#E5EBF2] dark:border-zinc-800">
            <div className="flex items-center gap-2">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt={userName}
                  className="w-7 h-7 rounded-full object-cover border border-[#E5EBF2] dark:border-zinc-700 shadow-2xs"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white text-[11px] font-extrabold shadow-2xs shadow-emerald-500/20">
                  {userInitial}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <div className="font-bold text-[#19213D] dark:text-slate-200 text-xs truncate max-w-[120px]">
                  {userName}
                </div>
              </div>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/auth/signup" })}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
