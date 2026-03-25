"use client";

import { cn } from "@/lib/utils";

const NAV_TABS = [
  { id: "kanban", label: "Kanban", active: true },
  { id: "coming-soon", label: "Coming Soon", active: false },
];

export function TopBar() {
  return (
    <header className="flex h-12 border-b border-zinc-800 bg-zinc-950">
      {/* Logo zone — aligned with sidebar width */}
      <div className="flex w-56 shrink-0 items-center border-r border-zinc-800 px-4">
        <span className="text-lg font-bold text-white tracking-tight">
          Agently<span className="text-blue-500">.ai</span>
        </span>
      </div>

      {/* Nav tabs zone */}
      <nav className="flex items-center gap-1 px-4">
        {NAV_TABS.map((tab) => (
          <button
            key={tab.id}
            disabled={!tab.active}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab.active
                ? "bg-zinc-800 text-white"
                : "text-zinc-500 cursor-not-allowed"
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
