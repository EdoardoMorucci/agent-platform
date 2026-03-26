"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TaskExecution, TaskStatus } from "@/lib/types";

interface OutputDialogProps {
  taskId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true, connects to SSE stream immediately on open */
  isRunning: boolean;
  /** Current task status — when "question", feedback input shows immediately */
  taskStatus?: TaskStatus;
  /** All executions for this task — used to build conversation history */
  executions?: TaskExecution[];
  /** Called when SSE stream ends (to trigger SWR revalidation) */
  onComplete?: () => void;
}

export function OutputDialog({
  taskId,
  open,
  onOpenChange,
  isRunning,
  taskStatus,
  executions = [],
  onComplete,
}: OutputDialogProps) {
  // Output of the current streaming run (clears when a new run starts)
  const [streamingOutput, setStreamingOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [runKey, setRunKey] = useState(0);
  const outputRef = useRef<HTMLDivElement>(null);
  const prevOpen = useRef(false);

  // Initialize when dialog transitions closed → open
  useEffect(() => {
    const justOpened = open && !prevOpen.current;
    prevOpen.current = open;
    if (!justOpened) return;

    if (isRunning) {
      setStreamingOutput("");
      setShowFeedback(false);
      setFeedback("");
      setRunKey((k) => k + 1);
    } else {
      setStreamingOutput("");
      setShowFeedback(taskStatus === "question");
      setFeedback("");
      setRunKey(0);
    }
  }, [open, isRunning, taskStatus]);

  // SSE streaming — triggered by runKey
  useEffect(() => {
    if (!open || runKey === 0) return;

    setStreaming(true);
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
                  setStreamingOutput((prev) => prev + data.text);
                }
                if (currentEvent === "done") {
                  setStreaming(false);
                  onComplete?.();
                }
                if (currentEvent === "error") {
                  setStreamingOutput((prev) => prev + `\n[Error: ${data.message}]`);
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
  }, [open, taskId, runKey]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [streamingOutput, executions]);

  async function handleReply() {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "question" }),
    });
    onComplete?.();
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
    setStreamingOutput("");
    setShowFeedback(false);
    setRunKey((k) => k + 1);
  }

  // Completed executions sorted chronologically, with actual output
  const completedHistory = executions
    .filter((e) => e.output.length > 0)
    .sort((a, b) => a.started_at.localeCompare(b.started_at));

  // Avoid showing streaming output if SWR already updated executions with it
  const lastHistoryOutput = completedHistory[completedHistory.length - 1]?.output ?? "";
  const showCurrentOutput =
    streamingOutput.length > 0 && streamingOutput !== lastHistoryOutput;

  const hasAnything = completedHistory.length > 0 || showCurrentOutput || streaming;
  const showReplyButton = !streaming && !showFeedback && hasAnything;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-700 max-w-5xl w-full flex flex-col max-h-[90vh]">
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

        <div
          ref={outputRef}
          className="flex-1 overflow-auto rounded bg-zinc-950 p-4 min-h-[400px] space-y-4"
        >
          {!hasAnything && !streaming && (
            <p className="text-xs font-mono text-zinc-500">No output available</p>
          )}

          {completedHistory.map((exec, i) => (
            <div key={exec.id} className="space-y-3">
              {exec.feedback && (
                <div>
                  <div className="text-[10px] font-mono text-blue-500 mb-1 select-none">
                    ── You ──────────────────────────────────
                  </div>
                  <pre className="text-xs font-mono text-blue-200 whitespace-pre-wrap">
                    {exec.feedback}
                  </pre>
                </div>
              )}
              <div>
                <div className="text-[10px] font-mono text-zinc-600 mb-1 select-none">
                  ── Agent · Run {i + 1} ──────────────────────
                </div>
                <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap">
                  {exec.output}
                </pre>
              </div>
            </div>
          ))}

          {(showCurrentOutput || (streaming && !showCurrentOutput)) && (
            <div>
              <div className="text-[10px] font-mono text-zinc-600 mb-1 select-none">
                ── Agent · Run {completedHistory.length + 1} ──────────────────────
              </div>
              <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap">
                {streamingOutput || "Starting agent..."}
              </pre>
            </div>
          )}
        </div>

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
