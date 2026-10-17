"use client";

import React, { useState } from "react";
import { Code2, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";

interface CodeViewerProps {
  code?: string | null;
  title?: string;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ code, title = "Underlying Python Code (The Analyst)" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!code) return null;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-[#E5EBF2] dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900 text-xs">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 bg-[#F5F7FB] dark:bg-zinc-800/50 flex items-center justify-between cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="font-semibold text-[#19213D] dark:text-zinc-200">{title}</span>
          <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded font-mono">
            python
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 transition-colors flex items-center gap-1 text-[11px]"
            title="Copy code"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
          {isOpen ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
        </div>
      </div>

      {isOpen && (
        <div className="p-3 bg-zinc-950 text-zinc-100 font-mono text-[11px] overflow-x-auto border-t border-zinc-200 dark:border-zinc-800">
          <pre>{code}</pre>
        </div>
      )}
    </div>
  );
};
