import { NextRequest, NextResponse } from "next/server";
import {
  readTextFile,
  writeTextFile,
  readJsonFile,
  getAgentClaudeMdPath,
  getAgentConfigPath,
} from "@/lib/data";
import type { Agent } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const agent = await readJsonFile<Agent>(getAgentConfigPath(id));
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }
  const content = await readTextFile(getAgentClaudeMdPath(id));
  return NextResponse.json({ content: content ?? "" });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const agent = await readJsonFile<Agent>(getAgentConfigPath(id));
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }
  const { content } = await request.json();
  await writeTextFile(getAgentClaudeMdPath(id), content ?? "");
  return NextResponse.json({ success: true });
}
