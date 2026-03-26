import { NextRequest, NextResponse } from "next/server";
import { readJsonFile, writeJsonFile, deleteJsonFile, getTaskPath } from "@/lib/data";
import type { Task, UpdateTaskInput } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const task = await readJsonFile<Task>(getTaskPath(id));
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  return NextResponse.json(task);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const task = await readJsonFile<Task>(getTaskPath(id));
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const body: UpdateTaskInput = await request.json();
  const updated: Task = {
    ...task,
    ...(body.title !== undefined && { title: body.title }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.type !== undefined && { type: body.type }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.team_override !== undefined && { team_override: body.team_override }),
    ...(body.rerun_mode !== undefined && { rerun_mode: body.rerun_mode }),
    ...(body.agent_id !== undefined && { agent_id: body.agent_id }),
    updated_at: new Date().toISOString(),
  };

  await writeJsonFile(getTaskPath(id), updated);
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = await deleteJsonFile(getTaskPath(id));
  if (!deleted) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
