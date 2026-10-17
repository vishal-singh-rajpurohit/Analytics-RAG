"use client";

import React from "react";
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Lightbulb, 
  Activity,
  Layers,
  FileCheck2,
  Table as TableIcon
} from "lucide-react";

interface DataQualitySectionProps {
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
  datasetName: string;
}

export const DataQualitySection: React.FC<DataQualitySectionProps> = ({ 
  cleaningReport, 
  datasetName 
}) => {
  if (!cleaningReport) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs">
        No quality audit data available for this dataset.
      </div>
    );
  }

  const score = cleaningReport.health_score ?? 100;
  const rows = cleaningReport.total_rows ?? 0;
  const cols = cleaningReport.total_columns ?? 0;
  const missing = cleaningReport.total_missing_cells ?? 0;
  const duplicates = cleaningReport.duplicate_rows ?? 0;
  const anomalies = cleaningReport.anomalies || [];
  const recommendations = cleaningReport.recommendations || [];
  const columns = cleaningReport.columns || [];

  const isHealthy = score >= 80;

  return (
    <div className="space-y-6">
      {/* 1. Header Overview Banner */}
      <div className={`p-6 rounded-2xl border transition-all ${
        isHealthy 
          ? "bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30"
          : "bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border-rose-500/30"
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
              isHealthy ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
            }`}>
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-[#19213D] dark:text-white">
                  Agent 1: Dataset Quality &amp; Cleanliness Audit
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                  isHealthy 
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                }`}>
                  Score {score}/100
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                Comprehensive data hygiene evaluation for <code className="font-mono font-bold px-1.5 py-0.5 rounded bg-white/60 dark:bg-zinc-800">{datasetName}</code>. 
                Audited null cells, duplicate rows, data type validity, and IQR statistical boundaries.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-2xl font-black font-display text-[#19213D] dark:text-white tabular-nums">
                {score}%
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                Integrity Grade
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Audit Breakdown Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Missing Values Card */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-[#E5EBF2] dark:border-zinc-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-500 uppercase tracking-wider">Empty Cells</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              missing === 0 
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" 
                : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
            }`}>
              {missing === 0 ? "Zero Missing" : "Needs Imputation"}
            </span>
          </div>
          <div className="text-3xl font-black font-display text-[#19213D] dark:text-white tracking-tight tabular-nums">
            {missing.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {missing === 0 
              ? "All columns have 100% complete records." 
              : "Missing cells detected across one or more features."}
          </p>
        </div>

        {/* Duplicate Rows Card */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-[#E5EBF2] dark:border-zinc-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-500 uppercase tracking-wider">Duplicate Rows</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              duplicates === 0 
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" 
                : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
            }`}>
              {duplicates === 0 ? "Zero Duplicates" : "Redundancies Found"}
            </span>
          </div>
          <div className="text-3xl font-black font-display text-[#19213D] dark:text-white tracking-tight tabular-nums">
            {duplicates.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {duplicates === 0 
              ? "Every observation row is unique." 
              : "Redundant rows detected that may bias aggregations."}
          </p>
        </div>

        {/* IQR Outliers Card */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-[#E5EBF2] dark:border-zinc-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-500 uppercase tracking-wider">Statistical Outliers</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              IQR Rule (1.5×)
            </span>
          </div>
          <div className="text-3xl font-black font-display text-[#19213D] dark:text-white tracking-tight tabular-nums">
            {anomalies.length}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {anomalies.length === 0 
              ? "All values reside within normal tolerance." 
              : `${anomalies.length} column groups contain distribution outliers.`}
          </p>
        </div>
      </div>

      {/* 3. Detailed Anomaly Inspector Table */}
      {anomalies.length > 0 && (
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-[#E5EBF2] dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#19213D] dark:text-white">
                  Identified Statistical Anomalies
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Deviations detected via Interquartile Range analysis (Q₁ - 1.5×IQR, Q₃ + 1.5×IQR)
                </p>
              </div>
            </div>

            <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">
              {anomalies.length} Anomaly Groups
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-950/60 border-b border-[#E5EBF2] dark:border-zinc-800 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-2.5 px-3">Feature Column</th>
                  <th className="py-2.5 px-3">Observed Deviation</th>
                  <th className="py-2.5 px-3 text-right">Flagged Count</th>
                  <th className="py-2.5 px-3 text-right">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                {anomalies.map((a, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/30">
                    <td className="py-3 px-3 font-mono font-bold text-[#19213D] dark:text-white">
                      {a.column}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                      {a.description}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#19213D] dark:text-slate-200">
                      {a.count ?? "N/A"}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                        Moderate Outlier
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Cleaning Recommendations Checklist */}
      {recommendations.length > 0 && (
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-[#E5EBF2] dark:border-zinc-800 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#19213D] dark:text-white">
                Agent 1 Recommendations for Data Sanitization
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automated action items to optimize model performance and analytical accuracy
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
            {recommendations.map((rec, idx) => (
              <div 
                key={idx} 
                className="p-3 rounded-xl bg-[#F5F7FB] dark:bg-zinc-950/60 border border-[#E5EBF2] dark:border-zinc-800/80 flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Continuous Features Matrix (Mean, Min, Max) */}
      {columns.length > 0 && (
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-[#E5EBF2] dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <TableIcon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#19213D] dark:text-white">
                  Continuous Feature Statistical Profile
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Computed moments across all continuous and numerical attributes
                </p>
              </div>
            </div>

            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {columns.length} Total Columns
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-950/60 border-b border-[#E5EBF2] dark:border-zinc-800 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-2.5 px-3">Column</th>
                  <th className="py-2.5 px-3">Data Type</th>
                  <th className="py-2.5 px-3 text-right">Mean Average</th>
                  <th className="py-2.5 px-3 text-right">Minimum</th>
                  <th className="py-2.5 px-3 text-right">Maximum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-mono">
                {columns.map((col, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/30">
                    <td className="py-2.5 px-3 font-bold text-[#19213D] dark:text-white font-sans">
                      {col.name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {col.dtype}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                      {col.mean !== undefined ? Number(col.mean).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">
                      {col.min !== undefined ? Number(col.min).toLocaleString() : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">
                      {col.max !== undefined ? Number(col.max).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
