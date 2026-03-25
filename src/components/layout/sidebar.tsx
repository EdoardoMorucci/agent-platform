"use client";

import { cn } from "@/lib/utils";
import { Bot, Users, Sparkles, Settings } from "lucide-react";

const SIDEBAR_ITEMS = [
  { id: "agents", label: "Agents", icon: Bot },
  { id: "teams", label: "Teams", icon: Users },
  { id: "skills", label: "Skills", icon: Sparkles },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 p-3 gap-1">
      {SIDEBAR_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
              "text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        );
      })}
    </aside>
  );
}
