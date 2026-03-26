export type TaskStatus = "backlog" | "todo" | "in_progress" | "review" | "done";

export interface TaskExecution {
  id: string;
  started_at: string;
  ended_at: string | null;
  status: "running" | "success" | "error" | "stopped";
  output: string;
  feedback: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  type: string;
  status: TaskStatus;
  team_override: string | null;
  agent_id: string | null;
  rerun_mode: "continue" | "fresh";
  executions: TaskExecution[];
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  type: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  type?: string;
  status?: TaskStatus;
  team_override?: string | null;
  agent_id?: string | null;
  rerun_mode?: "continue" | "fresh";
}

export const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "backlog", label: "Backlog" },
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" },
];

// ── Agents ──────────────────────────────────────────────────────────────────

export type AgentModel =
  | "eu.anthropic.claude-opus-4-6-v1"
  | "eu.anthropic.claude-sonnet-4-6"
  | "eu.anthropic.claude-haiku-4-5-20251001";

export interface Agent {
  id: string;
  name: string;
  description: string;
  model: AgentModel;
  working_dir: string;
  skills: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateAgentInput {
  name: string;
  description: string;
  model: AgentModel;
  working_dir: string;
}

export interface UpdateAgentInput {
  name?: string;
  description?: string;
  model?: AgentModel;
  working_dir?: string;
  skills?: string[];
}

export const AGENT_MODELS: { id: AgentModel; label: string }[] = [
  { id: "eu.anthropic.claude-opus-4-6-v1", label: "Claude Opus 4.6" },
  { id: "eu.anthropic.claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { id: "eu.anthropic.claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
];
