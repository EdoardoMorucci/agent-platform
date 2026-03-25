# Agently.ai — Plan 1: Foundation + Kanban

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a working kanban board with the full Agently.ai layout (top bar, sidebar, kanban columns), task CRUD, drag-and-drop, and a JSON file-based data layer.

**Architecture:** Next.js 14 App Router monolith — API routes serve JSON from `data/` directory, React frontend renders kanban board with dnd-kit for drag-and-drop. No database — all state is persisted as JSON files on disk.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, dnd-kit, uuid

---

## File Structure

```
agents-platform/
├── src/
│   ├── app/
│   │   ├── layout.tsx              (root layout with top bar + sidebar + main area)
│   │   ├── page.tsx                (kanban board — home page)
│   │   ├── globals.css             (tailwind + custom styles)
│   │   └── api/
│   │       └── tasks/
│   │           ├── route.ts        (GET all tasks, POST create task)
│   │           └── [id]/
│   │               └── route.ts    (GET/PUT/DELETE single task)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── top-bar.tsx         (top bar: logo + nav tabs)
│   │   │   └── sidebar.tsx         (sidebar: Agents, Teams, Skills, Settings)
│   │   ├── kanban/
│   │   │   ├── board.tsx           (kanban board container with dnd context)
│   │   │   ├── column.tsx          (single kanban column)
│   │   │   ├── task-card.tsx       (draggable task card)
│   │   │   └── create-task-dialog.tsx (dialog to create/edit a task)
│   │   └── ui/                     (shadcn components — auto-generated)
│   ├── lib/
│   │   ├── data.ts                 (read/write JSON files from data/ directory)
│   │   └── types.ts                (TypeScript interfaces: Task, Column, etc.)
│   └── hooks/
│       └── use-tasks.ts            (SWR hook for task CRUD)
├── data/
│   └── tasks/                      (task JSON files — one per task)
├── config.json                     (global settings placeholder)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── postcss.config.mjs
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`, `postcss.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `config.json`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd "C:\Users\e.morucci\Desktop\Project\X Personal Projects\agents-platform"
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```

Select defaults when prompted. This creates the Next.js 14 project with TypeScript, Tailwind, ESLint, App Router, and `src/` directory.

- [ ] **Step 2: Install dependencies**

```bash
cd "C:\Users\e.morucci\Desktop\Project\X Personal Projects\agents-platform"
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities uuid swr
npm install -D @types/uuid
```

- [ ] **Step 3: Install shadcn/ui**

```bash
cd "C:\Users\e.morucci\Desktop\Project\X Personal Projects\agents-platform"
npx shadcn@latest init -d
```

Then install the components we need:

```bash
npx shadcn@latest add button card dialog input label select textarea badge
```

- [ ] **Step 4: Create data directories and global config**

```bash
cd "C:\Users\e.morucci\Desktop\Project\X Personal Projects\agents-platform"
mkdir -p data/tasks data/agents data/teams data/skills/marketplace data/skills/custom
```

Create `config.json`:
```json
{
  "aws_profile": "bedrock",
  "aws_region": "eu-west-1",
  "default_model": "eu.anthropic.claude-sonnet-4-6",
  "claude_cli_path": "claude"
}
```

- [ ] **Step 5: Create .gitignore**

Create `.gitignore`:
```
node_modules/
.next/
.env
.env.local
```

- [ ] **Step 6: Verify project runs**

```bash
cd "C:\Users\e.morucci\Desktop\Project\X Personal Projects\agents-platform"
npm run dev
```

Expected: Next.js dev server starts on `http://localhost:3000`, default page renders.

- [ ] **Step 7: Commit**

```bash
cd "C:\Users\e.morucci\Desktop\Project\X Personal Projects\agents-platform"
git add -A
git commit -m "chore: initialize Next.js project with dependencies"
```

---

### Task 2: TypeScript Types

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Define core types**

Create `src/lib/types.ts`:
```typescript
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
```

- [ ] **Step 2: Verify types compile**

```bash
cd "C:\Users\e.morucci\Desktop\Project\X Personal Projects\agents-platform"
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\e.morucci\Desktop\Project\X Personal Projects\agents-platform"
git add src/lib/types.ts
git commit -m "feat: add core TypeScript types for tasks and kanban"
```

---

### Task 3: Data Layer

**Files:**
- Create: `src/lib/data.ts`

- [ ] **Step 1: Implement JSON file read/write utilities**

Create `src/lib/data.ts`:
```typescript
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
```

- [ ] **Step 2: Verify it compiles**

```bash
cd "C:\Users\e.morucci\Desktop\Project\X Personal Projects\agents-platform"
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\e.morucci\Desktop\Project\X Personal Projects\agents-platform"
git add src/lib/data.ts
git commit -m "feat: add JSON file-based data layer"
```

---

### Task 4: Task API Routes

**Files:**
- Create: `src/app/api/tasks/route.ts`, `src/app/api/tasks/[id]/route.ts`

- [ ] **Step 1: Create GET all + POST task route**

Create `src/app/api/tasks/route.ts`:
```typescript
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
    rerun_mode: "fresh",
    executions: [],
    created_at: now,
    updated_at: now,
  };

  await writeJsonFile(getTaskPath(task.id), task);
  return NextResponse.json(task, { status: 201 });
}
```

- [ ] **Step 2: Create GET/PUT/DELETE single task route**

Create `src/app/api/tasks/[id]/route.ts`:
```typescript
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
```

- [ ] **Step 3: Test the API manually**

```bash
cd "C:\Users\e.morucci\Desktop\Project\X Personal Projects\agents-platform"
npm run dev &
sleep 3

# Create a task
curl -s -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Test task","description":"My first task","type":"general"}' | head -c 200

echo ""

# List tasks
curl -s http://localhost:3000/api/tasks | head -c 200
```

Expected: POST returns the created task with an id. GET returns an array containing that task.

Kill the dev server after testing.

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\e.morucci\Desktop\Project\X Personal Projects\agents-platform"
git add src/app/api/tasks/
git commit -m "feat: add task CRUD API routes"
```

---

### Task 5: SWR Hook for Tasks

**Files:**
- Create: `src/hooks/use-tasks.ts`

- [ ] **Step 1: Create SWR-based task hook**

Create `src/hooks/use-tasks.ts`:
```typescript
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
```

- [ ] **Step 2: Verify it compiles**

```bash
cd "C:\Users\e.morucci\Desktop\Project\X Personal Projects\agents-platform"
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\e.morucci\Desktop\Project\X Personal Projects\agents-platform"
git add src/hooks/use-tasks.ts
git commit -m "feat: add SWR hook for task CRUD operations"
```

---

### Task 6: Layout Shell (Top Bar + Sidebar)

**Files:**
- Create: `src/components/layout/top-bar.tsx`, `src/components/layout/sidebar.tsx`
- Modify: `src/app/layout.tsx`, `src/app/globals.css`

- [ ] **Step 1: Create TopBar component**

Create `src/components/layout/top-bar.tsx`:
```tsx
"use client";

import { cn } from "@/lib/utils";

const NAV_TABS = [
  { id: "kanban", label: "Kanban", active: true },
  { id: "coming-soon", label: "Coming Soon", active: false },
];

export function TopBar() {
  return (
    <header className="flex h-12 border-b border-zinc-800 bg-zinc-950">
      {/* Logo zone — aligned with sidebar width */}
      <div className="flex w-56 shrink-0 items-center border-r border-zinc-800 px-4">
        <span className="text-lg font-bold text-white tracking-tight">
          Agently<span className="text-blue-500">.ai</span>
        </span>
      </div>

      {/* Nav tabs zone */}
      <nav className="flex items-center gap-1 px-4">
        {NAV_TABS.map((tab) => (
          <button
            key={tab.id}
            disabled={!tab.active}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab.active
                ? "bg-zinc-800 text-white"
                : "text-zinc-500 cursor-not-allowed"
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
```

- [ ] **Step 2: Create Sidebar component**

Create `src/components/layout/sidebar.tsx`:
```tsx
"use client";

import { cn } from "@/lib/utils";
import { Bot, Users, Sparkles, Settings } from "lucide-react";

const SIDEBAR_ITEMS = [
  { id: "agents", label: "Agents", icon: Bot },
  { id: "teams", label: "Teams", icon: Users },
  { id: "skills", label: "Skills", icon: Sparkles },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 p-3 gap-1">
      {SIDEBAR_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
              "text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        );
      })}
    </aside>
  );
}
```

- [ ] **Step 3: Install lucide-react for icons**

```bash
cd "C:\Users\e.morucci\Desktop\Project\X Personal Projects\agents-platform"
npm install lucide-react
```

- [ ] **Step 4: Update root layout**

Replace `src/app/layout.tsx` with:
```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TopBar } from "@/components/layout/top-bar";
import { Sidebar } from "@/components/layout/sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Agently.ai",
  description: "Agent Management Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-zinc-950 text-zinc-100 antialiased`}>
        <div className="flex h-screen flex-col overflow-hidden">
          <TopBar />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-auto bg-zinc-900 p-6">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Update globals.css**

Replace `src/app/globals.css` with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 3.9%;
    --foreground: 0 0% 98%;
  }
}
```

- [ ] **Step 6: Update page.tsx placeholder**

Replace `src/app/page.tsx` with:
```tsx
export default function Home() {
  return (
    <div className="flex items-center justify-center h-full text-zinc-500">
      Kanban board loading...
    </div>
  );
}
```

- [ ] **Step 7: Verify layout renders**

```bash
cd "C:\Users\e.morucci\Desktop\Project\X Personal Projects\agents-platform"
npm run dev
```

Open `http://localhost:3000`. Expected: Dark UI with top bar showing "Agently.ai" logo + "Kanban" / "Coming Soon" tabs, sidebar with Agents/Teams/Skills/Settings icons, and main area with placeholder text.

- [ ] **Step 8: Commit**

```bash
cd "C:\Users\e.morucci\Desktop\Project\X Personal Projects\agents-platform"
git add src/components/layout/ src/app/layout.tsx src/app/globals.css src/app/page.tsx
git commit -m "feat: add layout shell with top bar and sidebar"
```

---

### Task 7: Kanban Board

**Files:**
- Create: `src/components/kanban/board.tsx`, `src/components/kanban/column.tsx`, `src/components/kanban/task-card.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create TaskCard component**

Create `src/components/kanban/task-card.tsx`:
```tsx
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Task } from "@/lib/types";
import { GripVertical, Trash2 } from "lucide-react";

interface TaskCardProps {
  task: Task;
  onDelete: (id: string) => void;
}

export function TaskCard({ task, onDelete }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="bg-zinc-800 border-zinc-700 p-3 cursor-default group"
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab text-zinc-600 hover:text-zinc-400 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-100 truncate">
            {task.title}
          </p>
          {task.description && (
            <p className="mt-1 text-xs text-zinc-400 line-clamp-2">
              {task.description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="secondary" className="text-xs bg-zinc-700 text-zinc-300">
              {task.type}
            </Badge>
          </div>
        </div>
        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-opacity"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Create Column component**

Create `src/components/kanban/column.tsx`:
```tsx
"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { TaskCard } from "./task-card";
import type { Task, TaskStatus } from "@/lib/types";

interface ColumnProps {
  id: TaskStatus;
  label: string;
  tasks: Task[];
  onDeleteTask: (id: string) => void;
}

export function Column({ id, label, tasks, onDeleteTask }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-zinc-300">{label}</h3>
        <span className="text-xs text-zinc-500">{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-2 rounded-lg border border-dashed p-2 transition-colors ${
          isOver ? "border-blue-500 bg-blue-500/5" : "border-zinc-800 bg-zinc-900/50"
        }`}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onDelete={onDeleteTask} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <p className="py-8 text-center text-xs text-zinc-600">
            Drop tasks here
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create Board component**

Create `src/components/kanban/board.tsx`:
```tsx
"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { useState } from "react";
import { Column } from "./column";
import { TaskCard } from "./task-card";
import { useTasks } from "@/hooks/use-tasks";
import { COLUMNS, type Task, type TaskStatus } from "@/lib/types";

export function Board() {
  const { tasks, updateTask, deleteTask, isLoading } = useTasks();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function tasksByColumn(status: TaskStatus): Task[] {
    return tasks.filter((t) => t.status === status);
  }

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Determine target column — over could be a column id or another task id
    let targetStatus: TaskStatus;
    const isColumn = COLUMNS.some((c) => c.id === over.id);
    if (isColumn) {
      targetStatus = over.id as TaskStatus;
    } else {
      const overTask = tasks.find((t) => t.id === over.id);
      if (!overTask) return;
      targetStatus = overTask.status;
    }

    if (task.status !== targetStatus) {
      await updateTask(taskId, { status: targetStatus });
    }
  }

  function handleDragOver(_event: DragOverEvent) {
    // Future: reorder within column
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        Loading tasks...
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <Column
            key={col.id}
            id={col.id}
            label={col.label}
            tasks={tasksByColumn(col.id)}
            onDeleteTask={deleteTask}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <TaskCard task={activeTask} onDelete={() => {}} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
```

- [ ] **Step 4: Wire board into page.tsx**

Replace `src/app/page.tsx` with:
```tsx
"use client";

import { Board } from "@/components/kanban/board";

export default function Home() {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-100">Kanban</h1>
      </div>
      <div className="flex-1 overflow-hidden">
        <Board />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify board renders**

```bash
cd "C:\Users\e.morucci\Desktop\Project\X Personal Projects\agents-platform"
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
cd "C:\Users\e.morucci\Desktop\Project\X Personal Projects\agents-platform"
git add src/components/kanban/board.tsx src/components/kanban/column.tsx src/components/kanban/task-card.tsx src/app/page.tsx
git commit -m "feat: add kanban board with drag-and-drop columns"
```

---

### Task 8: Create Task Dialog

**Files:**
- Create: `src/components/kanban/create-task-dialog.tsx`

- [ ] **Step 1: Create the dialog component**

Create `src/components/kanban/create-task-dialog.tsx`:
```tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTasks } from "@/hooks/use-tasks";
import { Plus } from "lucide-react";

const TASK_TYPES = [
  "general",
  "feature-dev",
  "bugfix",
  "code-review",
  "report",
  "research",
];

export function CreateTaskDialog() {
  const { createTask } = useTasks();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("general");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    await createTask({ title: title.trim(), description, type });
    setTitle("");
    setDescription("");
    setType("general");
    setIsSubmitting(false);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-700">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              className="bg-zinc-800 border-zinc-700"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What needs to be done?"
              className="bg-zinc-800 border-zinc-700"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {TASK_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || isSubmitting}>
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Update page.tsx to include the dialog**

Replace `src/app/page.tsx` with:
```tsx
"use client";

import { Board } from "@/components/kanban/board";
import { CreateTaskDialog } from "@/components/kanban/create-task-dialog";

export default function Home() {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-100">Kanban</h1>
        <CreateTaskDialog />
      </div>
      <div className="flex-1 overflow-hidden">
        <Board />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify full app compiles and runs**

```bash
cd "C:\Users\e.morucci\Desktop\Project\X Personal Projects\agents-platform"
npx tsc --noEmit && npm run dev
```

Open `http://localhost:3000`. Expected: Full layout with kanban board. Click "New Task" → dialog opens → create a task → it appears in the Backlog column. Drag it to another column → status updates.

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\e.morucci\Desktop\Project\X Personal Projects\agents-platform"
git add src/components/kanban/create-task-dialog.tsx src/app/page.tsx
git commit -m "feat: add create task dialog with form"
```

---

### Task 9: Final Polish — Status Badges + Empty States

**Files:**
- Modify: `src/components/kanban/task-card.tsx`

- [ ] **Step 1: Add execution status indicator to task card**

In `src/components/kanban/task-card.tsx`, update the badge section to also show execution status when relevant. Replace the badge `div` at the bottom of the card:

Find this block:
```tsx
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="secondary" className="text-xs bg-zinc-700 text-zinc-300">
              {task.type}
            </Badge>
          </div>
```

Replace with:
```tsx
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="secondary" className="text-xs bg-zinc-700 text-zinc-300">
              {task.type}
            </Badge>
            {task.status === "in_progress" && task.executions.some((e) => e.status === "running") && (
              <Badge className="text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                Running
              </Badge>
            )}
            {task.status === "review" && (
              <Badge className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">
                Review
              </Badge>
            )}
          </div>
```

- [ ] **Step 2: Verify it compiles**

```bash
cd "C:\Users\e.morucci\Desktop\Project\X Personal Projects\agents-platform"
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Full manual test**

```bash
cd "C:\Users\e.morucci\Desktop\Project\X Personal Projects\agents-platform"
npm run dev
```

Test the full flow:
1. Open `http://localhost:3000`
2. Verify dark UI layout: top bar with "Agently.ai" + tabs, sidebar with icons, kanban columns
3. Click "New Task" → fill form → create
4. Task appears in Backlog
5. Drag task to To Do → column updates
6. Drag to In Progress → column updates
7. Drag to Review → "Review" badge appears
8. Drag to Done
9. Hover task → delete icon appears → click → task deleted

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\e.morucci\Desktop\Project\X Personal Projects\agents-platform"
git add -A
git commit -m "feat: add status badges and polish task cards"
```

---

## Summary

**Plan 1 delivers:**
- Next.js 14 project with TypeScript, Tailwind, shadcn/ui
- Full layout: top bar (Agently.ai logo + nav tabs), sidebar (Agents/Teams/Skills/Settings), main area
- Kanban board with 5 columns: Backlog → To Do → In Progress → Review → Done
- Task CRUD: create via dialog, delete via hover button
- Drag-and-drop between columns (status updates persist to JSON files)
- Status badges on task cards
- JSON file-based data layer in `data/tasks/`

**Next plans:**
- **Plan 2: Agents + Execution** — Agent CRUD, CLAUDE.md editor, AI-assisted generation, Claude CLI execution, SSE streaming, Agent Inspector
- **Plan 3: Teams, Skills + AI Generation** — Team CRUD + modes, skills marketplace + custom, Bedrock AI generation, orchestration engine
