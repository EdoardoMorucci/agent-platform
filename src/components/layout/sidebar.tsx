"use client";

import { cn } from "@/lib/utils";
import { Bot, Users, Sparkles, Settings } from "lucide-react";

const SIDEBAR_ITEMS = [
  { id: "agents", label: "Agents", icon: Bot },
  { id: "teams", label: "Teams", icon: Users, disabled: true },
  { id: "skills", label: "Skills", icon: Sparkles, disabled: true },
  { id: "settings", label: "Settings", icon: Settings, disabled: true },
];

interface SidebarProps {
  activePanel: string | null;
  onPanelChange: (panel: string | null) => void;
}

export function Sidebar({ activePanel, onPanelChange }: SidebarProps) {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 p-3 gap-1">
      {SIDEBAR_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activePanel === item.id;
        return (
          <button
            key={item.id}
            disabled={item.disabled}
            onClick={() => onPanelChange(isActive ? null : item.id)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-zinc-700 text-white"
                : item.disabled
                ? "text-zinc-600 cursor-not-allowed"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
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
