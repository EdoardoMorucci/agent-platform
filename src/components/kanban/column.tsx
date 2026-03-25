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
