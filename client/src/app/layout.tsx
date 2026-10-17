import type { Metadata } from "next";
import "./globals.css";
import Provider from "@/components/Provider";

export const metadata: Metadata = {
  title: "Syntropic Analytics — Multi-Agent Data Intelligence & Diagnostics",
  description: "Autonomous data cleaning, natural language analytics, and high-definition chart synthesis powered by LangGraph multi-agent workflows.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,300..800;1,300..800&family=Outfit:wght@400..900&family=Plus+Jakarta+Sans:ital,wght@0,300..800;1,300..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-[#F5F7FB] dark:bg-zinc-950 text-[#19213D] dark:text-slate-100">
        <Provider>
          {children}
        </Provider>
      </body>
    </html>
  );
}
