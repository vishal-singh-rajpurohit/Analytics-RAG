"use client";

import React, { useState } from "react";
import { 
  ArrowUp, 
  Loader2, 
  FileSpreadsheet,
  Plus,
  Sparkles,
  BarChart2,
  TrendingUp,
  AlertCircle
} from "lucide-react";

interface FloatingInputProps {
  targetFileName: string;
  onSendQuery: (query: string) => void;
  isLoading: boolean;
  onNewChat?: () => void;
}

export const FloatingInput: React.FC<FloatingInputProps> = ({
  targetFileName,
  onSendQuery,
  isLoading,
  onNewChat,
}) => {
  const [query, setQuery] = useState("");

  const suggestedPrompts = [
    { label: "💬 What is Churn?", query: "What is customer churn and what are standard industry strategies to reduce it?" },
    { label: "📊 Outlier Distribution", query: "Plot the outlier distribution for numeric features" },
    { label: "📈 Category Summary", query: "Break down the records and averages by category" },
    { label: "🔍 Correlation Matrix", query: "Calculate correlations between continuous variables and plot a heatmap" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    onSendQuery(query.trim());
    setQuery("");
  };

  const handleSelectPrompt = (promptText: string) => {
    if (isLoading) return;
    onSendQuery(promptText);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-2">
      {/* 1. Quick Prompt Suggestion Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0 px-1">
          <Sparkles className="w-3 h-3 text-emerald-500" />
          <span>Suggestions:</span>
        </span>
        {suggestedPrompts.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSelectPrompt(p.query)}
            disabled={isLoading}
            className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-white/90 dark:bg-zinc-900/90 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-[#E5EBF2] dark:border-zinc-800 text-[#19213D] dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-200 font-medium shadow-xs transition-all disabled:opacity-50"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 2. Main Input Box */}
      <form
        onSubmit={handleSubmit}
        className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-[#E5EBF2] dark:border-zinc-800 rounded-2xl shadow-xl p-2 sm:p-2.5 flex items-center gap-3 transition-all focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10"
      >
        <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 ml-1">
          <Sparkles className="w-4 h-4" />
        </div>

        {/* Input */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            targetFileName && targetFileName !== "Direct AI Assistant" && targetFileName !== "Direct LLM Assistant"
              ? `Ask anything about ${targetFileName} (e.g., "What is churn?" or "Plot trend chart")...`
              : "Ask the LLM any question (e.g., 'What is customer churn?')... Tools run if required."
          }
          disabled={isLoading}
          className="flex-1 bg-transparent px-2 text-xs sm:text-sm text-[#19213D] dark:text-white placeholder-slate-400 focus:outline-none disabled:opacity-50"
        />

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!query.trim() || isLoading}
          className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center shrink-0 transition-colors shadow-sm shadow-emerald-500/20"
          title="Send query to Multi-Agent Engine"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowUp className="w-4 h-4 stroke-[2.5]" />
          )}
        </button>
      </form>

      {/* 3. Subtext info */}
      <div className="flex items-center justify-between px-2 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
          <span>Active context: <strong className="text-[#19213D] dark:text-slate-300">{targetFileName}</strong></span>
        </span>
        <span className="hidden sm:inline">
          Agent pipeline: Cleaner &bull; Analyst &bull; Visualizer
        </span>
      </div>
    </div>
  );
};
