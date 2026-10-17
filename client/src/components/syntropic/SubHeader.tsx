"use client";

import React from "react";
import { 
  FileSpreadsheet,
  Plus,
  Trash2,
  Share2,
  LayoutDashboard,
  MessageSquare,
  ShieldCheck,
  BarChart3,
  Table as TableIcon
} from "lucide-react";

export type DashboardTab = "overview" | "chat" | "quality" | "visuals" | "explorer";

interface SubHeaderProps {
  title?: string;
  datasetName: string;
  rowCount: number;
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  chatCount?: number;
  chartsCount?: number;
  anomaliesCount?: number;
  onNewChat?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
}

export const SubHeader: React.FC<SubHeaderProps> = ({
  title,
  datasetName,
  rowCount,
  activeTab,
  onTabChange,
  chatCount = 0,
  chartsCount = 0,
  anomaliesCount = 0,
  onNewChat,
  onDelete,
  onExport
}) => {
  const tabs: Array<{ id: DashboardTab; label: string; icon: React.ReactNode; badge?: string | number; badgeColor?: string }> = [
    { 
      id: "overview", 
      label: "Overview", 
      icon: <LayoutDashboard className="w-3.5 h-3.5" /> 
    },
    { 
      id: "chat", 
      label: "AI Analyst", 
      icon: <MessageSquare className="w-3.5 h-3.5" />,
      badge: chatCount > 0 ? chatCount : undefined,
      badgeColor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
    },
    { 
      id: "quality", 
      label: "Quality & Audit", 
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
      badge: anomaliesCount > 0 ? `${anomaliesCount} Outliers` : "Clean",
      badgeColor: anomaliesCount > 0 
        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" 
        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
    },
    { 
      id: "visuals", 
      label: "Visualizations", 
      icon: <BarChart3 className="w-3.5 h-3.5" />,
      badge: chartsCount > 0 ? chartsCount : undefined,
      badgeColor: "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300"
    },
    { 
      id: "explorer", 
      label: "Data Explorer", 
      icon: <TableIcon className="w-3.5 h-3.5" /> 
    },
  ];

  return (
    <div className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-[#E5EBF2] dark:border-zinc-800 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 select-none">
      {/* 1. Left: Dataset Context Tag */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-xs sm:text-sm text-[#19213D] dark:text-white truncate max-w-[200px] sm:max-w-xs">
              {title || datasetName}
            </h2>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono">
              <span>{rowCount.toLocaleString()} rows</span>
              <span>&bull;</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Active Session</span>
            </div>
          </div>
        </div>

        {/* 2. Middle: Segmented Tabs */}
        <div className="hidden md:flex items-center gap-1 bg-[#F5F7FB] dark:bg-zinc-900/80 p-1 rounded-xl border border-[#E5EBF2] dark:border-zinc-800">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-[#19213D] dark:hover:text-white hover:bg-white/50 dark:hover:bg-zinc-800/50"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${tab.badgeColor}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Right: Quick Action Buttons */}
      <div className="flex items-center gap-2">
        {onNewChat && (
          <button
            onClick={onNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl text-xs font-semibold shadow-xs shadow-emerald-500/20 transition-colors"
            title="Upload another CSV dataset"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Analysis</span>
          </button>
        )}

        {onExport && (
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-[#E5EBF2] dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-[#19213D] dark:text-slate-300 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
            title="Export CSV"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Export</span>
          </button>
        )}

        {onDelete && (
          <button
            onClick={onDelete}
            className="p-2 bg-white dark:bg-zinc-900 border border-[#E5EBF2] dark:border-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 rounded-xl text-xs text-slate-400 transition-colors shadow-2xs"
            title="Delete this analysis session"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Mobile Tab row */}
      <div className="flex md:hidden w-full items-center gap-1 overflow-x-auto pb-1 border-t border-[#E5EBF2] dark:border-zinc-800/80 pt-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                isActive
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
