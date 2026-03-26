"use client";

import { useState } from "react";
import { AgentList } from "./agent-list";
import { AgentForm } from "./agent-form";
import type { Agent } from "@/lib/types";

interface AgentPanelProps {
  onClose: () => void;
}

type PanelView = { type: "list" } | { type: "form"; agent?: Agent };

export function AgentPanel({ onClose }: AgentPanelProps) {
  const [view, setView] = useState<PanelView>({ type: "list" });

  return (
    <div className="flex w-80 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-100">Agents</h2>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300 text-lg leading-none"
        >
          ×
        </button>
      </div>

      {view.type === "list" && (
        <AgentList
          onCreateNew={() => setView({ type: "form" })}
          onEdit={(agent) => setView({ type: "form", agent })}
        />
      )}

      {view.type === "form" && (
        <AgentForm
          agent={view.agent}
          onBack={() => setView({ type: "list" })}
          onSaved={() => setView({ type: "list" })}
        />
      )}
    </div>
  );
}
