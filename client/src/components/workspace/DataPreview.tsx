"use client";

import React, { useState } from "react";
import { 
  Database, 
  Hash, 
  Type, 
  Calendar,
  ToggleLeft,
  ChevronDown, 
  ChevronUp, 
  Download,
  Search,
  Table as TableIcon,
  X
} from "lucide-react";

interface DataPreviewProps {
  columns: Array<{ name: string; dtype: string }>;
  sampleData: Array<Record<string, unknown>>;
  totalRows: number;
  datasetName?: string;
  onDownloadCsv?: () => void;
}

export const DataPreview: React.FC<DataPreviewProps> = ({ 
  columns, 
  sampleData, 
  totalRows,
  datasetName,
  onDownloadCsv
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);

  const filteredColumns = columns.filter((col) =>
    col.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDtypeBadge = (dtype: string) => {
    const d = dtype.toLowerCase();
    if (d.includes("int")) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <Hash className="w-2.5 h-2.5" />
          <span>INT</span>
        </span>
      );
    }
    if (d.includes("float")) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
          <Hash className="w-2.5 h-2.5" />
          <span>FLOAT</span>
        </span>
      );
    }
    if (d.includes("date") || d.includes("time")) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <Calendar className="w-2.5 h-2.5" />
          <span>DATE</span>
        </span>
      );
    }
    if (d.includes("bool")) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <ToggleLeft className="w-2.5 h-2.5" />
          <span>BOOL</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-slate-300 border border-[#E5EBF2] dark:border-zinc-700">
        <Type className="w-2.5 h-2.5" />
        <span>STR</span>
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-[#E5EBF2] dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm transition-all">
      {/* Header Bar */}
      <div className="p-4 border-b border-[#E5EBF2] dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 bg-[#F5F7FB] dark:bg-zinc-950/40">
        <div 
          className="flex items-center gap-3 cursor-pointer select-none"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#19213D] dark:text-white flex items-center gap-2">
              <span>{datasetName ? `${datasetName} Explorer` : "Dataset Explorer"}</span>
              <span className="text-xs bg-slate-200/70 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-mono font-medium">
                {totalRows.toLocaleString()} rows × {columns.length} cols
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Interactive sample preview and schema inspection
            </p>
          </div>
          <button className="p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 ml-1">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {isExpanded && (
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter column names..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-xs pl-8 pr-7 py-1.5 rounded-xl border border-[#E5EBF2] dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[#19213D] dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-44 sm:w-56 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {onDownloadCsv && (
              <button
                onClick={onDownloadCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-[#E5EBF2] dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-700/60 rounded-xl text-xs font-semibold text-[#19213D] dark:text-slate-200 shadow-2xs transition-colors"
                title="Download CSV dataset"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>Export CSV</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Expanded Table */}
      {isExpanded && (
        <>
          <div className="overflow-x-auto max-h-[420px]">
            {sampleData.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                <TableIcon className="w-8 h-8 mx-auto text-slate-300 dark:text-zinc-700" />
                <div>No data records found in preview.</div>
              </div>
            ) : filteredColumns.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No columns match &quot;{searchTerm}&quot;.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/75 dark:bg-zinc-950/80 sticky top-0 z-10 border-b border-slate-200 dark:border-zinc-800">
                    <th className="py-2.5 px-3 font-mono font-bold text-slate-400 text-[11px] w-12 text-center">
                      #
                    </th>
                    {filteredColumns.map((col) => (
                      <th
                        key={col.name}
                        className="py-2.5 px-3.5 font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-200/60 dark:border-zinc-800/80 last:border-r-0 whitespace-nowrap"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{col.name}</span>
                          {getDtypeBadge(col.dtype)}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                  {sampleData.map((row, idx) => (
                    <tr 
                      key={idx} 
                      className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors"
                    >
                      <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-400 bg-slate-50/50 dark:bg-zinc-950/30 tabular-nums">
                        {idx + 1}
                      </td>
                      {filteredColumns.map((col) => {
                        const cellVal = row[col.name];
                        const isNull = cellVal === null || cellVal === undefined || cellVal === "";

                        return (
                          <td
                            key={col.name}
                            className="py-2 px-3.5 text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-zinc-800/40 last:border-r-0 whitespace-nowrap font-mono text-[11px] tabular-nums"
                          >
                            {isNull ? (
                              <span className="text-rose-400 italic font-sans text-[10px] bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.2 rounded border border-rose-200 dark:border-rose-900/50">
                                null
                              </span>
                            ) : (
                              String(cellVal)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer bar */}
          <div className="p-3 border-t border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-950/40 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              Showing {Math.min(sampleData.length, 50)} rows of {totalRows.toLocaleString()} total observations
            </span>
            <span className="text-[11px] text-slate-400">
              {filteredColumns.length} of {columns.length} features displayed
            </span>
          </div>
        </>
      )}
    </div>
  );
};
