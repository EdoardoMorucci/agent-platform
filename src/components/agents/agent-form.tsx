"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAgents } from "@/hooks/use-agents";
import { AGENT_MODELS, type Agent } from "@/lib/types";
import { ArrowLeft } from "lucide-react";

interface AgentFormProps {
  agent?: Agent;           // undefined = create mode, defined = edit mode
  onBack: () => void;
  onSaved: () => void;
}

export function AgentForm({ agent, onBack, onSaved }: AgentFormProps) {
  const { createAgent, updateAgent, getClaudeMd, saveClaudeMd } = useAgents();

  const [name, setName] = useState(agent?.name ?? "");
  const [description, setDescription] = useState(agent?.description ?? "");
  const [model, setModel] = useState<Agent["model"]>(agent?.model ?? "eu.anthropic.claude-sonnet-4-6");
  const [workingDir, setWorkingDir] = useState(agent?.working_dir ?? "");
  const [claudeMd, setClaudeMd] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load CLAUDE.md when editing
  useEffect(() => {
    if (agent) {
      getClaudeMd(agent.id).then(setClaudeMd);
    }
  }, [agent?.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);

    if (agent) {
      await updateAgent(agent.id, { name: name.trim(), description, model, working_dir: workingDir });
      await saveClaudeMd(agent.id, claudeMd);
    } else {
      const created = await createAgent({ name: name.trim(), description, model, working_dir: workingDir });
      await saveClaudeMd(created.id, claudeMd);
    }

    setIsSubmitting(false);
    onSaved();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
        <button onClick={onBack} className="text-zinc-500 hover:text-zinc-300">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h3 className="text-sm font-semibold text-zinc-100">
          {agent ? "Edit Agent" : "New Agent"}
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4 overflow-y-auto flex-1">
        <div className="space-y-1.5">
          <Label htmlFor="agent-name">Name</Label>
          <Input
            id="agent-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="code-reviewer"
            className="bg-zinc-800 border-zinc-700"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="agent-desc">Description</Label>
          <Input
            id="agent-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this agent do?"
            className="bg-zinc-800 border-zinc-700"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="agent-model">Model</Label>
          <Select value={model} onValueChange={(v) => { if (v) setModel(v as Agent["model"]); }}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              {AGENT_MODELS.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="agent-dir">Working Directory</Label>
          <Input
            id="agent-dir"
            value={workingDir}
            onChange={(e) => setWorkingDir(e.target.value)}
            placeholder="C:/Users/e.morucci/workspaces/nome-agente"
            className="bg-zinc-800 border-zinc-700 font-mono text-xs"
          />
        </div>

        <div className="space-y-1.5 flex-1 flex flex-col">
          <Label htmlFor="claude-md">CLAUDE.md</Label>
          <Textarea
            id="claude-md"
            value={claudeMd}
            onChange={(e) => setClaudeMd(e.target.value)}
            placeholder="# Agent instructions&#10;&#10;You are a..."
            className="bg-zinc-800 border-zinc-700 font-mono text-xs flex-1 resize-none min-h-[180px]"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onBack} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={!name.trim() || isSubmitting} className="flex-1">
            {isSubmitting ? "Saving..." : agent ? "Save" : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
}
