"use client";

import React from "react";
import { 
  ShieldCheck, 
  Activity, 
  Database, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Sparkles,
  TrendingUp,
  Percent
} from "lucide-react";

interface KpiCardsProps {
  cleaningReport?: {
    health_score?: number;
    total_rows?: number;
    total_columns?: number;
    total_missing_cells?: number;
    duplicate_rows?: number;
    anomalies?: Array<{ column: string; description: string; count?: number }>;
    recommendations?: string[];
    columns?: Array<{ name: string; dtype: string; mean?: number; min?: number; max?: number }>;
  } | null;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ cleaningReport }) => {
  if (!cleaningReport) return null;

  const score = cleaningReport.health_score ?? 100;
  const rows = cleaningReport.total_rows ?? 0;
  const cols = cleaningReport.total_columns ?? 0;
  const missing = cleaningReport.total_missing_cells ?? 0;
  const duplicates = cleaningReport.duplicate_rows ?? 0;
  const anomalies = cleaningReport.anomalies || [];
  const totalCells = (rows * cols) || 1;
  const completenessPct = Math.max(0, 100 - (missing / totalCells) * 100);

  // Find primary numeric column for real metric calculation
  const numCols = (cleaningReport.columns || []).filter(c => c.mean !== undefined);
  const primaryNum = numCols.length > 0 ? numCols[0] : null;

  const isHealthy = score >= 80;

  return (
    <div className="space-y-4">
      {/* 1. Executive Health & Anomaly Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Data Health & Quality Audit */}
        <div className={`p-4 rounded-2xl border transition-all duration-200 ${
          isHealthy
            ? "bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30 text-emerald-950 dark:text-emerald-200"
            : "bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent border-rose-500/30 text-rose-950 dark:text-rose-200"
        }`}>
          <div className="flex items-start gap-3.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
              isHealthy 
                ? "bg-emerald-600 text-white" 
                : "bg-rose-600 text-white"
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>

            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-bold text-sm text-[#19213D] dark:text-white flex items-center gap-1.5">
                  <span>Data Integrity Audit</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    isHealthy
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                      : "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300"
                  }`}>
                    {score}/100 Health
                  </span>
                </h4>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Agent 1: The Cleaner</span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Scanned <strong className="text-[#19213D] dark:text-white">{rows.toLocaleString()} rows</strong> across{" "}
                <strong className="text-[#19213D] dark:text-white">{cols} attributes</strong>.{" "}
                {missing === 0 && duplicates === 0 ? (
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                    No missing values or duplicate rows found. Dataset is pristine and analysis-ready.
                  </span>
                ) : (
                  <span>
                    Detected <strong className="text-amber-600 dark:text-amber-400">{missing} empty cells</strong> and{" "}
                    <strong className="text-rose-600 dark:text-rose-400">{duplicates} duplicate rows</strong> requiring attention.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Statistical Anomaly Scanner */}
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent text-[#19213D] dark:text-slate-100 transition-all duration-200">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Activity className="w-5 h-5" />
            </div>

            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-bold text-sm text-[#19213D] dark:text-white flex items-center gap-1.5">
                  <span>IQR Statistical Scanner</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                    {anomalies.length} Flagged
                  </span>
                </h4>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Q₁ / Q₃ IQR Rules</span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {anomalies.length > 0 ? (
                  <>
                    Flagged <strong className="text-amber-700 dark:text-amber-300">{anomalies.length} anomaly groups</strong>.{" "}
                    Primary variance in <code className="px-1.5 py-0.5 rounded bg-amber-100/80 dark:bg-amber-900/60 font-mono font-bold text-amber-900 dark:text-amber-200">{anomalies[0].column}</code> ({anomalies[0].description}).
                  </>
                ) : (
                  <span>
                    All continuous metrics conform to regular statistical bounds without significant outlier clipping.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Grid - Readable & Spaced */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Total Observations */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/90 border border-[#E5EBF2] dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-emerald-400/50 transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Observations
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Database className="w-3.5 h-3.5" />
            </div>
          </div>

          <div>
            <div className="text-3xl font-black font-display text-[#19213D] dark:text-white tracking-tight tabular-nums">
              {rows.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-emerald-500" />
              <span>{cols} features indexed</span>
            </div>
          </div>

          <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full w-full"></div>
          </div>
        </div>

        {/* Metric 2: Health Audit Score */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/90 border border-[#E5EBF2] dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-emerald-400/50 transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Health Score
            </span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              isHealthy
                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>

          <div>
            <div className="text-3xl font-black font-display text-[#19213D] dark:text-white tracking-tight tabular-nums flex items-baseline gap-1">
              <span>{score}</span>
              <span className="text-sm font-semibold text-slate-400">/ 100</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {missing} nulls &bull; {duplicates} duplicates
            </div>
          </div>

          <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${isHealthy ? "bg-emerald-500" : "bg-rose-500"}`} 
              style={{ width: `${Math.min(100, Math.max(10, score))}%` }}
            ></div>
          </div>
        </div>

        {/* Metric 3: Primary Numeric Metric or Outliers */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/90 border border-[#E5EBF2] dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-amber-400/50 transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
              {primaryNum ? primaryNum.name : "Anomalies"}
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>

          <div>
            <div className="text-3xl font-black font-display text-[#19213D] dark:text-white tracking-tight tabular-nums truncate">
              {primaryNum && primaryNum.mean !== undefined 
                ? Number(primaryNum.mean).toLocaleString(undefined, { maximumFractionDigits: 1 })
                : anomalies.length
              }
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {primaryNum 
                ? `Mean value (min: ${primaryNum.min ?? 0}, max: ${primaryNum.max ?? 0})`
                : `${anomalies.length} outlier columns flagged`
              }
            </div>
          </div>

          <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full w-4/5"></div>
          </div>
        </div>

        {/* Metric 4: Completeness Rate */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/90 border border-[#E5EBF2] dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-teal-400/50 transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Completeness
            </span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Percent className="w-3.5 h-3.5" />
            </div>
          </div>

          <div>
            <div className="text-3xl font-black font-display text-[#19213D] dark:text-white tracking-tight tabular-nums">
              {completenessPct.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {missing === 0 ? "100% complete data cells" : `${missing} missing values`}
            </div>
          </div>

          <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-teal-500 h-full rounded-full" 
              style={{ width: `${completenessPct}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};
