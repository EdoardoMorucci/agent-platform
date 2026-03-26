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
  pointerWithin,
  rectIntersection,
  getFirstCollision,
  type CollisionDetection,
} from "@dnd-kit/core";
import { useState, useCallback } from "react";
import { Column } from "./column";
import { TaskCard } from "./task-card";
import { OutputDialog } from "@/components/agents/output-dialog";
import { useTasks } from "@/hooks/use-tasks";
import { COLUMNS, type Task, type TaskStatus } from "@/lib/types";

export function Board() {
  const { tasks, updateTask, deleteTask, isLoading, mutate } = useTasks();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [executionTaskId, setExecutionTaskId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Collision detection: prefer columns (by pointer position), fall back to rect intersection
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    const columnCollisions = pointerCollisions.filter((c) =>
      COLUMNS.some((col) => col.id === c.id)
    );
    if (columnCollisions.length > 0) return columnCollisions;

    const firstCollision = getFirstCollision(pointerCollisions);
    if (firstCollision) return [firstCollision];

    return rectIntersection(args);
  }, []);

  function tasksByColumn(status: TaskStatus): Task[] {
    if (status === "in_progress") {
      return tasks.filter((t) => t.status === "in_progress" || t.status === "question");
    }
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
      // Don't auto-run when dragging a question task within the in_progress column
      if (targetStatus === "in_progress" && task.agent_id && task.status !== "question") {
        setExecutionTaskId(taskId);
      }
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
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
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
              onExecutionComplete={mutate}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? (
            <TaskCard task={activeTask} onDelete={() => {}} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {executionTaskId && (
        <OutputDialog
          taskId={executionTaskId}
          open={!!executionTaskId}
          onOpenChange={(open) => {
            if (!open) {
              setExecutionTaskId(null);
              mutate();
            }
          }}
          isRunning={true}
          onComplete={() => {
            mutate();
          }}
        />
      )}
    </>
  );
}
