import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  listSubdirJsonFiles,
  writeJsonFile,
  writeTextFile,
  getAgentsDir,
  getAgentConfigPath,
  getAgentClaudeMdPath,
} from "@/lib/data";
import type { Agent, CreateAgentInput } from "@/lib/types";

export async function GET() {
  const agents = await listSubdirJsonFiles<Agent>(getAgentsDir(), "config.json");
  return NextResponse.json(agents);
}

export async function POST(request: NextRequest) {
  const body: CreateAgentInput = await request.json();

  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const agent: Agent = {
    id: uuidv4(),
    name: body.name.trim(),
    description: body.description || "",
    model: body.model || "eu.anthropic.claude-sonnet-4-6",
    working_dir: body.working_dir || "",
    skills: [],
    created_at: now,
    updated_at: now,
  };

  await writeJsonFile(getAgentConfigPath(agent.id), agent);
  // Create initial CLAUDE.md
  await writeTextFile(getAgentClaudeMdPath(agent.id), `# ${agent.name}\n\n${agent.description}\n`);

  return NextResponse.json(agent, { status: 201 });
}
