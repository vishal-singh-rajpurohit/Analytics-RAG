"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = "",
}) => {
  return (
    <div
      className={`markdown-content text-xs sm:text-sm text-[#19213D] dark:text-slate-200 leading-relaxed font-sans ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => (
            <h1
              className="text-base sm:text-lg font-bold text-[#19213D] dark:text-white mt-4 mb-2 first:mt-0 tracking-tight"
              {...props}
            />
          ),
          h2: ({ node, ...props }) => (
            <h2
              className="text-sm sm:text-base font-bold text-[#19213D] dark:text-white mt-3.5 mb-1.5 first:mt-0"
              {...props}
            />
          ),
          h3: ({ node, ...props }) => (
            <h3
              className="text-xs sm:text-sm font-semibold text-[#19213D] dark:text-white mt-3 mb-1.5 first:mt-0"
              {...props}
            />
          ),
          h4: ({ node, ...props }) => (
            <h4
              className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-2.5 mb-1 first:mt-0"
              {...props}
            />
          ),
          p: ({ node, ...props }) => (
            <p
              className="my-2 leading-relaxed text-slate-700 dark:text-slate-300 first:mt-0 last:mb-0"
              {...props}
            />
          ),
          ul: ({ node, ...props }) => (
            <ul
              className="list-disc pl-5 my-2.5 space-y-1.5 text-slate-700 dark:text-slate-300"
              {...props}
            />
          ),
          ol: ({ node, ...props }) => (
            <ol
              className="list-decimal pl-5 my-2.5 space-y-1.5 text-slate-700 dark:text-slate-300"
              {...props}
            />
          ),
          li: ({ node, ...props }) => (
            <li className="leading-relaxed pl-0.5" {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong
              className="font-semibold text-[#19213D] dark:text-white"
              {...props}
            />
          ),
          em: ({ node, ...props }) => (
            <em className="italic text-slate-600 dark:text-slate-400" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20 px-4 py-2 my-3 rounded-r-xl text-slate-700 dark:text-slate-300 italic"
              {...props}
            />
          ),
          table: ({ node, ...props }) => (
            <div className="my-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
              <table
                className="min-w-full divide-y divide-slate-200 dark:divide-zinc-800 text-left text-xs"
                {...props}
              />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead
              className="bg-slate-100/80 dark:bg-zinc-800 text-[#19213D] dark:text-slate-200 font-semibold"
              {...props}
            />
          ),
          th: ({ node, ...props }) => (
            <th
              scope="col"
              className="px-3.5 py-2.5 text-left text-[11px] sm:text-xs font-semibold tracking-wider text-slate-800 dark:text-slate-200"
              {...props}
            />
          ),
          tbody: ({ node, ...props }) => (
            <tbody
              className="divide-y divide-slate-100 dark:divide-zinc-800/60 bg-white dark:bg-zinc-900/60"
              {...props}
            />
          ),
          tr: ({ node, ...props }) => (
            <tr
              className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors"
              {...props}
            />
          ),
          td: ({ node, ...props }) => (
            <td
              className="px-3.5 py-2 text-xs text-slate-700 dark:text-slate-300"
              {...props}
            />
          ),
          code: ({ node, className, children, ...props }) => {
            const isCodeBlock = String(children).includes("\n");
            if (isCodeBlock) {
              return (
                <div className="my-3 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-[#0d1117] text-slate-100 text-[11px] sm:text-xs font-mono p-3.5 overflow-x-auto">
                  <code {...props}>{children}</code>
                </div>
              );
            }
            return (
              <code
                className="px-1.5 py-0.5 rounded-md font-mono text-[11px] sm:text-xs bg-slate-100 dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 border border-slate-200/70 dark:border-zinc-700"
                {...props}
              >
                {children}
              </code>
            );
          },
          hr: ({ node, ...props }) => (
            <hr
              className="my-4 border-slate-200 dark:border-zinc-800"
              {...props}
            />
          ),
          a: ({ node, ...props }) => (
            <a
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
              target="_blank"
              rel="noreferrer"
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
