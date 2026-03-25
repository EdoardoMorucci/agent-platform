import useSWR from "swr";
import type { Task, CreateTaskInput, UpdateTaskInput } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useTasks() {
  const { data, error, isLoading, mutate } = useSWR<Task[]>("/api/tasks", fetcher);

  async function createTask(input: CreateTaskInput): Promise<Task> {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const task = await res.json();
    await mutate();
    return task;
  }

  async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const task = await res.json();
    await mutate();
    return task;
  }

  async function deleteTask(id: string): Promise<void> {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    await mutate();
  }

  return {
    tasks: data || [],
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
    mutate,
  };
}
