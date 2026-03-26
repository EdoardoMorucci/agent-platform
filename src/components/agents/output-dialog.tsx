"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface OutputDialogProps {
  taskId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true, connects to SSE stream; when false, shows initialOutput */
  isRunning: boolean;
  /** Pre-loaded output for completed executions */
  initialOutput?: string;
  /** Called when SSE stream ends (to trigger SWR revalidation) */
  onComplete?: () => void;
}

export function OutputDialog({
  taskId,
  open,
  onOpenChange,
  isRunning,
  initialOutput = "",
  onComplete,
}: OutputDialogProps) {
  const [output, setOutput] = useState(initialOutput);
  const [streaming, setStreaming] = useState(false);
  const outputRef = useRef<HTMLPreElement>(null);

  // When dialog opens in running mode, connect to SSE
  useEffect(() => {
    if (!open || !isRunning) return;

    setOutput("");
    setStreaming(true);
    let aborted = false;

    (async () => {
      try {
        const response = await fetch(`/api/execute?task_id=${taskId}`);
        if (!response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done || aborted) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          let currentEvent = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (currentEvent === "output" && data.text !== undefined) {
                  setOutput((prev) => prev + data.text);
                }
                if (currentEvent === "done") {
                  setStreaming(false);
                  onComplete?.();
                }
                if (currentEvent === "error") {
                  setOutput((prev) => prev + `\n[Error: ${data.message}]`);
                  setStreaming(false);
                  onComplete?.();
                }
              } catch {
                // ignore malformed JSON
              }
            }
          }
        }
      } catch {
        // stream closed
      }
      setStreaming(false);
    })();

    return () => {
      aborted = true;
    };
  }, [open, isRunning, taskId]);

  // Reset output when switching to non-running mode
  useEffect(() => {
    if (!isRunning) {
      setOutput(initialOutput);
    }
  }, [isRunning, initialOutput]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-700 max-w-3xl w-full flex flex-col max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            Execution Output
            {streaming && (
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            )}
          </DialogTitle>
        </DialogHeader>
        <pre
          ref={outputRef}
          className="flex-1 overflow-auto rounded bg-zinc-950 p-4 text-xs font-mono text-zinc-300 min-h-[300px] whitespace-pre-wrap"
        >
          {output || (streaming ? "Starting agent..." : "No output available")}
        </pre>
      </DialogContent>
    </Dialog>
  );
}
