"use client";

import React from "react";
import { ShieldCheck, AlertTriangle, Sparkles, CheckCircle } from "lucide-react";

interface HealthCardProps {
  report: {
    health_score?: number;
    total_rows?: number;
    total_columns?: number;
    total_missing_cells?: number;
    duplicate_rows?: number;
    anomalies?: Array<{ column: string; description: string }>;
    recommendations?: string[];
  };
}

export const HealthCard: React.FC<HealthCardProps> = ({ report }) => {
  const score = report.health_score ?? 100;

  const getScoreColor = (val: number) => {
    if (val >= 85) return "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800";
    if (val >= 65) return "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800";
    return "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-800";
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="font-semibold text-sm text-[#19213D] dark:text-zinc-100">
            Agent 1: Dataset Health Audit
          </h3>
        </div>
        <div className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getScoreColor(score)}`}>
          Health Score: {score}/100
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Total Rows</div>
          <div className="text-base font-bold font-display text-zinc-900 dark:text-zinc-100 tabular-nums">
            {report.total_rows?.toLocaleString() ?? 0}
          </div>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Columns</div>
          <div className="text-base font-bold font-display text-zinc-900 dark:text-zinc-100 tabular-nums">
            {report.total_columns ?? 0}
          </div>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Missing Values</div>
          <div className={`text-base font-bold font-display tabular-nums ${(report.total_missing_cells ?? 0) > 0 ? "text-amber-600" : "text-emerald-600"}`}>
            {report.total_missing_cells ?? 0}
          </div>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Duplicates</div>
          <div className={`text-base font-bold font-display tabular-nums ${(report.duplicate_rows ?? 0) > 0 ? "text-red-600" : "text-emerald-600"}`}>
            {report.duplicate_rows ?? 0}
          </div>
        </div>
      </div>

      {report.anomalies && report.anomalies.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Statistical Anomalies Detected ({report.anomalies.length})</span>
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {report.anomalies.slice(0, 3).map((a, idx) => (
              <div key={idx} className="text-xs text-zinc-600 dark:text-zinc-300 bg-amber-50/50 dark:bg-amber-950/20 px-2 py-1 rounded border border-amber-200/50 dark:border-amber-900/30">
                <span className="font-semibold">{a.column}:</span> {a.description}
              </div>
            ))}
          </div>
        </div>
      )}

      {report.recommendations && report.recommendations.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Cleaner Recommendations</span>
          </div>
          <ul className="space-y-1">
            {report.recommendations.slice(0, 3).map((rec, i) => (
              <li key={i} className="text-xs text-zinc-600 dark:text-zinc-400 flex items-start gap-1.5">
                <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
