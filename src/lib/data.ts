import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function deleteJsonFile(filePath: string): Promise<boolean> {
  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function listJsonFiles<T>(dir: string): Promise<T[]> {
  await ensureDir(dir);
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results: T[] = [];
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".json")) {
      const data = await readJsonFile<T>(path.join(dir, entry.name));
      if (data) results.push(data);
    }
  }
  return results;
}

export function getTaskPath(id: string): string {
  return path.join(DATA_DIR, "tasks", `${id}.json`);
}

export function getTasksDir(): string {
  return path.join(DATA_DIR, "tasks");
}

// ── Agent paths ──────────────────────────────────────────────────────────────

export function getAgentsDir(): string {
  return path.join(DATA_DIR, "agents");
}

export function getAgentDir(id: string): string {
  return path.join(DATA_DIR, "agents", id);
}

export function getAgentConfigPath(id: string): string {
  return path.join(DATA_DIR, "agents", id, "config.json");
}

export function getAgentClaudeMdPath(id: string): string {
  return path.join(DATA_DIR, "agents", id, "CLAUDE.md");
}

// ── Text file helpers ─────────────────────────────────────────────────────────

export async function readTextFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

export async function writeTextFile(filePath: string, content: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, "utf-8");
}

// ── Subdirectory JSON list ────────────────────────────────────────────────────

export async function listSubdirJsonFiles<T>(
  dir: string,
  filename: string
): Promise<T[]> {
  await ensureDir(dir);
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results: T[] = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const data = await readJsonFile<T>(path.join(dir, entry.name, filename));
      if (data) results.push(data);
    }
  }
  return results;
}
