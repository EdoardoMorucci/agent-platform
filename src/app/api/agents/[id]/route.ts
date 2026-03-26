import { NextRequest, NextResponse } from "next/server";
import {
  readJsonFile,
  writeJsonFile,
  getAgentConfigPath,
  getAgentDir,
} from "@/lib/data";
import type { Agent, UpdateAgentInput } from "@/lib/types";
import fs from "fs/promises";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const agent = await readJsonFile<Agent>(getAgentConfigPath(id));
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }
  return NextResponse.json(agent);
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

  const body: UpdateAgentInput = await request.json();
  const updated: Agent = {
    ...agent,
    ...(body.name !== undefined && { name: body.name }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.model !== undefined && { model: body.model }),
    ...(body.working_dir !== undefined && { working_dir: body.working_dir }),
    ...(body.skills !== undefined && { skills: body.skills }),
    updated_at: new Date().toISOString(),
  };

  await writeJsonFile(getAgentConfigPath(id), updated);
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const agent = await readJsonFile<Agent>(getAgentConfigPath(id));
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  await fs.rm(getAgentDir(id), { recursive: true, force: true });
  return NextResponse.json({ success: true });
}
