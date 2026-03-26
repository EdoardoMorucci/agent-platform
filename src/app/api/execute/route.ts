import { NextRequest } from "next/server";
import AnthropicBedrock from "@anthropic-ai/bedrock-sdk";
import { v4 as uuidv4 } from "uuid";
import {
  readJsonFile,
  writeJsonFile,
  getTaskPath,
  getAgentConfigPath,
  getAgentClaudeMdPath,
  readTextFile,
} from "@/lib/data";
import type { Task, Agent, TaskExecution, TaskStatus } from "@/lib/types";

export async function GET(request: NextRequest) {
  const taskId = request.nextUrl.searchParams.get("task_id");
  if (!taskId) {
    return new Response("task_id required", { status: 400 });
  }

  const encoder = new TextEncoder();
  let controllerClosed = false;
  let currentExecId = "";
  const sdkAbort = new AbortController();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: object) {
        if (controllerClosed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          controllerClosed = true;
        }
      }

      function close() {
        if (!controllerClosed) {
          controllerClosed = true;
          try { controller.close(); } catch { /* already closed */ }
        }
      }

      // ── Load task ────────────────────────────────────────────────────────
      const task = await readJsonFile<Task>(getTaskPath(taskId));
      if (!task) { send("error", { message: "Task not found" }); close(); return; }
      if (!task.agent_id) { send("error", { message: "No agent assigned" }); close(); return; }
      if (task.executions.some((e) => e.status === "running")) {
        send("error", { message: "Task is already running" }); close(); return;
      }

      // ── Load agent ───────────────────────────────────────────────────────
      const agent = await readJsonFile<Agent>(getAgentConfigPath(task.agent_id));
      if (!agent) { send("error", { message: "Agent not found" }); close(); return; }

      const claudeMd = await readTextFile(getAgentClaudeMdPath(task.agent_id));

      // ── Create execution record ──────────────────────────────────────────
      const execId = uuidv4();
      currentExecId = execId;
      const execution: TaskExecution = {
        id: execId,
        started_at: new Date().toISOString(),
        ended_at: null,
        status: "running",
        output: "",
        feedback: task.pending_feedback ?? null,
      };

      await writeJsonFile(getTaskPath(taskId), {
        ...task,
        status: "in_progress" as TaskStatus,
        executions: [...task.executions, execution],
        pending_feedback: null,
        updated_at: new Date().toISOString(),
      });

      send("start", { execution_id: execId });

      // ── Build messages array ─────────────────────────────────────────────
      // First turn: always the task itself
      const messages: AnthropicBedrock.MessageParam[] = [
        { role: "user", content: `${task.title}\n\n${task.description}` },
      ];

      // In continue mode, replay the full conversation history
      if (task.rerun_mode === "continue") {
        const history = task.executions
          .filter((e) => e.output.length > 0)
          .sort((a, b) => a.started_at.localeCompare(b.started_at));

        for (const exec of history) {
          // User reply that triggered this execution (if any)
          if (exec.feedback) {
            messages.push({ role: "user", content: exec.feedback });
          }
          messages.push({ role: "assistant", content: exec.output });
        }

        // Pending reply to the last execution
        if (task.pending_feedback) {
          messages.push({ role: "user", content: task.pending_feedback });
        }
      }

      // ── Stream via SDK ───────────────────────────────────────────────────
      // Set AWS_PROFILE before instantiating so the credential chain picks it up
      process.env.AWS_PROFILE = "bedrock";
      process.env.AWS_REGION = "eu-west-1";
      const client = new AnthropicBedrock({
        awsRegion: "eu-west-1",
      });

      let outputBuffer = "";
      let execStatus: "success" | "error" = "success";

      try {
        const sdkStream = client.messages.stream(
          {
            model: agent.model,
            max_tokens: 8192,
            ...(claudeMd ? { system: claudeMd } : {}),
            messages,
          },
          { signal: sdkAbort.signal }
        );

        for await (const event of sdkStream) {
          if (controllerClosed) break;
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const text = event.delta.text;
            outputBuffer += text;
            send("output", { text });
          }
        }
      } catch (err) {
        if (!sdkAbort.signal.aborted) {
          execStatus = "error";
          const msg = err instanceof Error ? err.message : String(err);
          send("error", { message: msg });
        }
      }

      // ── Persist result ───────────────────────────────────────────────────
      const latestTask = await readJsonFile<Task>(getTaskPath(taskId));
      if (latestTask) {
        const execIndex = latestTask.executions.findIndex((e) => e.id === execId);
        if (execIndex !== -1) {
          latestTask.executions[execIndex] = {
            ...latestTask.executions[execIndex],
            ended_at: new Date().toISOString(),
            status: execStatus,
            output: outputBuffer,
          };
          await writeJsonFile(getTaskPath(taskId), {
            ...latestTask,
            status: "in_progress" as TaskStatus,
            updated_at: new Date().toISOString(),
          });
        }
      }

      send("done", { status: execStatus });
      close();
    },

    cancel() {
      controllerClosed = true;
      sdkAbort.abort();
      // Mark the running execution as stopped so re-runs are not blocked
      if (currentExecId) {
        readJsonFile<Task>(getTaskPath(taskId as string))
          .then((t) => {
            if (!t) return;
            const i = t.executions.findIndex(
              (e) => e.id === currentExecId && e.status === "running"
            );
            if (i === -1) return;
            t.executions[i] = {
              ...t.executions[i],
              ended_at: new Date().toISOString(),
              status: "stopped",
            };
            writeJsonFile(getTaskPath(taskId as string), {
              ...t,
              status: "in_progress" as TaskStatus,
              updated_at: new Date().toISOString(),
            }).catch(() => {});
          })
          .catch(() => {});
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
