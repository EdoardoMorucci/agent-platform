import useSWR from "swr";
import type { Agent, CreateAgentInput, UpdateAgentInput } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useAgents() {
  const { data, error, isLoading, mutate } = useSWR<Agent[]>("/api/agents", fetcher);

  async function createAgent(input: CreateAgentInput): Promise<Agent> {
    const res = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const agent = await res.json();
    await mutate();
    return agent;
  }

  async function updateAgent(id: string, input: UpdateAgentInput): Promise<Agent> {
    const res = await fetch(`/api/agents/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const agent = await res.json();
    await mutate();
    return agent;
  }

  async function deleteAgent(id: string): Promise<void> {
    await fetch(`/api/agents/${id}`, { method: "DELETE" });
    await mutate();
  }

  async function getClaudeMd(id: string): Promise<string> {
    const res = await fetch(`/api/agents/${id}/claudemd`);
    const { content } = await res.json();
    return content;
  }

  async function saveClaudeMd(id: string, content: string): Promise<void> {
    await fetch(`/api/agents/${id}/claudemd`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
  }

  return {
    agents: data || [],
    isLoading,
    error,
    createAgent,
    updateAgent,
    deleteAgent,
    getClaudeMd,
    saveClaudeMd,
    mutate,
  };
}
