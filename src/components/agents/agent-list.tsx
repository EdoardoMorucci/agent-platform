"use client";

import { useAgents } from "@/hooks/use-agents";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Agent } from "@/lib/types";
import { AGENT_MODELS } from "@/lib/types";

interface AgentListProps {
  onCreateNew: () => void;
  onEdit: (agent: Agent) => void;
}

export function AgentList({ onCreateNew, onEdit }: AgentListProps) {
  const { agents, isLoading, deleteAgent } = useAgents();

  function modelLabel(model: Agent["model"]): string {
    return AGENT_MODELS.find((m) => m.id === model)?.label ?? model;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-zinc-800">
        <Button size="sm" className="w-full gap-1.5" onClick={onCreateNew}>
          <Plus className="h-4 w-4" />
          New Agent
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <p className="text-center text-xs text-zinc-600 py-8">Loading...</p>
        )}
        {!isLoading && agents.length === 0 && (
          <p className="text-center text-xs text-zinc-600 py-8">
            No agents yet.
          </p>
        )}
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="group flex items-start gap-2 px-4 py-3 border-b border-zinc-800/50 hover:bg-zinc-800/30"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-100 truncate">
                {agent.name}
              </p>
              {agent.description && (
                <p className="text-xs text-zinc-500 truncate mt-0.5">
                  {agent.description}
                </p>
              )}
              <Badge
                variant="secondary"
                className="mt-1.5 text-xs bg-zinc-700 text-zinc-400"
              >
                {modelLabel(agent.model)}
              </Badge>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                onClick={() => onEdit(agent)}
                className="text-zinc-500 hover:text-zinc-300 p-0.5"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => deleteAgent(agent.id)}
                className="text-zinc-500 hover:text-red-400 p-0.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
