"use client";

import React from "react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-[#F5F7FB] text-[#19213D] flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg border border-[#E5EBF2] max-w-md mx-auto">
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-500 mb-4">An unexpected error occurred in the application.</p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-500/20"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
