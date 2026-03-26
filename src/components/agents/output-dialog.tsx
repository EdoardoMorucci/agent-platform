"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TaskStatus } from "@/lib/types";

interface OutputDialogProps {
  taskId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true, connects to SSE stream immediately on open */
  isRunning: boolean;
  /** Current task status — when "question", feedback input shows immediately */
  taskStatus?: TaskStatus;
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
  taskStatus,
  initialOutput = "",
  onComplete,
}: OutputDialogProps) {
  const [output, setOutput] = useState(initialOutput);
  const [streaming, setStreaming] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState("");
  // runKey > 0 triggers SSE; increments on each run
  const [runKey, setRunKey] = useState(0);
  const outputRef = useRef<HTMLPreElement>(null);
  const prevOpen = useRef(false);

  // Initialize state when dialog transitions from closed → open
  useEffect(() => {
    const justOpened = open && !prevOpen.current;
    prevOpen.current = open;

    if (!justOpened) return;

    if (isRunning) {
      setOutput("");
      setShowFeedback(false);
      setFeedback("");
      setRunKey((k) => k + 1);
    } else {
      setOutput(initialOutput);
      // If task is already in question state (e.g. user closed dialog before replying)
      setShowFeedback(taskStatus === "question");
      setFeedback("");
      setRunKey(0);
    }
  }, [open, isRunning, initialOutput, taskStatus]);

  // SSE streaming — triggered by runKey
  useEffect(() => {
    if (!open || runKey === 0) return;

    setStreaming(true);
    setShowFeedback(false);
    const abortController = new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    (async () => {
      try {
        const response = await fetch(`/api/execute?task_id=${taskId}`, {
          signal: abortController.signal,
        });
        if (!response.body) return;

        reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

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
        // stream closed or aborted
      }
      setStreaming(false);
    })();

    return () => {
      abortController.abort();
      reader?.cancel().catch(() => {});
    };
  }, [open, taskId, runKey]); // onComplete excluded to avoid stale closure loops

  // Auto-scroll to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  async function handleReply() {
    // Mark task as "question" in the kanban so it's visible even if dialog is closed
    await fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "question" }),
    });
    onComplete?.(); // revalidate SWR so kanban updates
    setShowFeedback(true);
  }

  async function handleSubmitFeedback() {
    if (!feedback.trim()) return;
    await fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pending_feedback: feedback }),
    });
    setFeedback("");
    setOutput("");
    setRunKey((k) => k + 1);
  }

  const hasOutput = output.length > 0;
  const showReplyButton = !streaming && hasOutput && !showFeedback;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-700 max-w-3xl w-full flex flex-col max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            Execution Output
            {streaming && (
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            )}
            {showFeedback && !streaming && (
              <span className="text-xs font-normal text-red-400">
                — Waiting for your response
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <pre
          ref={outputRef}
          className="flex-1 overflow-auto rounded bg-zinc-950 p-4 text-xs font-mono text-zinc-300 min-h-[200px] whitespace-pre-wrap"
        >
          {output || (streaming ? "Starting agent..." : "No output available")}
        </pre>

        {showReplyButton && (
          <div className="pt-2 border-t border-zinc-800">
            <button
              onClick={handleReply}
              className="px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-xs text-zinc-300 transition-colors"
            >
              Reply
            </button>
          </div>
        )}

        {showFeedback && !streaming && (
          <div className="flex gap-2 pt-2 border-t border-zinc-800">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Type your response... (Ctrl+Enter to submit)"
              className="flex-1 rounded bg-zinc-800 border border-zinc-700 p-2 text-sm text-zinc-200 placeholder:text-zinc-500 resize-none focus:outline-none focus:ring-1 focus:ring-zinc-500"
              rows={3}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleSubmitFeedback();
                }
              }}
            />
            <button
              onClick={handleSubmitFeedback}
              disabled={!feedback.trim()}
              className="self-end px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-sm text-white transition-colors"
            >
              Continue
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
