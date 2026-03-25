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
  rerun_mode?: "continue" | "fresh";
}

export const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "backlog", label: "Backlog" },
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" },
];
