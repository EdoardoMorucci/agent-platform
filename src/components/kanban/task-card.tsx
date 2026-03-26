"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Task } from "@/lib/types";
import { GripVertical, Trash2, Terminal, Bot } from "lucide-react";
import { OutputDialog } from "@/components/agents/output-dialog";

interface TaskCardProps {
  task: Task;
  onDelete: (id: string) => void;
  onExecutionComplete?: () => void;
}

export function TaskCard({ task, onDelete, onExecutionComplete }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const [showOutput, setShowOutput] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const lastExecution = task.executions[task.executions.length - 1];
  const hasOutput = task.executions.length > 0;

  return (
    <>
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
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs bg-zinc-700 text-zinc-300">
                {task.type}
              </Badge>
              {task.agent_id && (
                <Badge className="text-xs bg-zinc-700/50 text-zinc-400 border-zinc-600 gap-1">
                  <Bot className="h-2.5 w-2.5" />
                  Agent
                </Badge>
              )}
              {task.status === "in_progress" &&
                task.executions.some((e) => e.status === "running") && (
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
          </div>
          <div className="flex gap-1 shrink-0">
            {hasOutput && (
              <button
                onClick={() => setShowOutput(true)}
                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-300 transition-opacity"
                title="View output"
              >
                <Terminal className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => onDelete(task.id)}
              className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-opacity"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </Card>

      {showOutput && lastExecution && (
        <OutputDialog
          taskId={task.id}
          open={showOutput}
          onOpenChange={setShowOutput}
          isRunning={false}
          initialOutput={lastExecution.output}
          onComplete={onExecutionComplete}
        />
      )}
    </>
  );
}
