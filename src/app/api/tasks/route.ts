import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { listJsonFiles, writeJsonFile, getTaskPath, getTasksDir } from "@/lib/data";
import type { Task, CreateTaskInput } from "@/lib/types";

export async function GET() {
  const tasks = await listJsonFiles<Task>(getTasksDir());
  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest) {
  const body: CreateTaskInput = await request.json();

  if (!body.title || !body.title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const task: Task = {
    id: uuidv4(),
    title: body.title.trim(),
    description: body.description || "",
    type: body.type || "general",
    status: "backlog",
    team_override: null,
    agent_id: null,
    rerun_mode: "fresh",
    pending_feedback: null,
    executions: [],
    created_at: now,
    updated_at: now,
  };

  await writeJsonFile(getTaskPath(task.id), task);
  return NextResponse.json(task, { status: 201 });
}
