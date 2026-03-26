import { NextRequest } from "next/server";
import { spawn } from "child_process";
import { v4 as uuidv4 } from "uuid";
import fs from "fs/promises";
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
  let spawnedProc: ReturnType<typeof spawn> | null = null;
  let currentExecId = "";

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: object) {
        if (controllerClosed) return;
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
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
      if (!task) {
        send("error", { message: "Task not found" });
        close();
        return;
      }

      if (!task.agent_id) {
        send("error", { message: "No agent assigned to this task" });
        close();
        return;
      }

      // Guard against double-invoke (React StrictMode dev or duplicate requests)
      if (task.executions.some((e) => e.status === "running")) {
        send("error", { message: "Task is already running" });
        close();
        return;
      }

      // ── Load agent ───────────────────────────────────────────────────────
      const agent = await readJsonFile<Agent>(getAgentConfigPath(task.agent_id));
      if (!agent) {
        send("error", { message: "Agent not found" });
        close();
        return;
      }

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

      const taskWithExec: Task = {
        ...task,
        status: "in_progress" as TaskStatus,
        executions: [...task.executions, execution],
        pending_feedback: null,
        updated_at: new Date().toISOString(),
      };
      await writeJsonFile(getTaskPath(taskId), taskWithExec);

      send("start", { execution_id: execId });

      // ── Prepare working directory ────────────────────────────────────────
      const workingDir = agent.working_dir || process.cwd();
      await fs.mkdir(workingDir, { recursive: true });

      // ── Build prompt ─────────────────────────────────────────────────────
      const systemContext = claudeMd ? `${claudeMd}\n\n---\n\n` : "";

      const lastExec =
        task.executions.length > 0
          ? task.executions[task.executions.length - 1]
          : null;

      let previousContext = "";
      if (task.rerun_mode === "continue" && lastExec) {
        previousContext = `\n\n## Previous execution output\n${lastExec.output}`;
      }
      if (task.pending_feedback) {
        previousContext += `\n\n## User Response\n${task.pending_feedback}`;
      }

      const prompt = `${systemContext}${task.title}\n\n${task.description}${previousContext}`;

      // ── Spawn claude CLI ─────────────────────────────────────────────────
      const proc = spawnedProc = spawn(
        "claude",
        ["-p", prompt, "--model", agent.model, "--output-format", "text"],
        {
          env: {
            ...process.env,
            AWS_PROFILE: "bedrock",
            AWS_REGION: "eu-west-1",
            CLAUDE_CODE_USE_BEDROCK: "1",
          },
          cwd: workingDir,
          windowsHide: true,
        }
      );

      let outputBuffer = "";

      // ── Stream output ────────────────────────────────────────────────────
      await new Promise<void>((resolve) => {
        proc.stdout.on("data", (chunk: Buffer) => {
          const text = chunk.toString();
          outputBuffer += text;
          send("output", { text });
        });

        proc.stderr.on("data", (chunk: Buffer) => {
          const text = chunk.toString();
          send("output", { text, stderr: true });
        });

        proc.on("error", (err) => {
          send("error", { message: err.message });
          resolve();
        });

        proc.on("close", (code) => {
          const execStatus = code === 0 ? "success" : "error";
          const newTaskStatus: TaskStatus = "review";

          readJsonFile<Task>(getTaskPath(taskId)).then((latestTask) => {
            if (!latestTask) return;
            const execIndex = latestTask.executions.findIndex(
              (e) => e.id === execId
            );
            if (execIndex === -1) return;
            latestTask.executions[execIndex] = {
              ...latestTask.executions[execIndex],
              ended_at: new Date().toISOString(),
              status: execStatus,
              output: outputBuffer,
            };
            const finalTask: Task = {
              ...latestTask,
              status: newTaskStatus,
              updated_at: new Date().toISOString(),
            };
            writeJsonFile(getTaskPath(taskId), finalTask).catch(console.error);
          });

          send("done", { exit_code: code, status: execStatus, task_status: newTaskStatus });
          resolve();
        });
      });

      close();
    },
    cancel() {
      // Client disconnected — stop streaming and kill the process
      controllerClosed = true;
      spawnedProc?.kill();
      // Mark the running execution as stopped so re-runs are not blocked
      if (currentExecId) {
        readJsonFile<Task>(getTaskPath(taskId as string)).then((latestTask) => {
          if (!latestTask) return;
          const execIndex = latestTask.executions.findIndex(
            (e) => e.id === currentExecId && e.status === "running"
          );
          if (execIndex === -1) return;
          latestTask.executions[execIndex] = {
            ...latestTask.executions[execIndex],
            ended_at: new Date().toISOString(),
            status: "stopped",
          };
          const cleanedTask: Task = {
            ...latestTask,
            status: "in_progress" as TaskStatus,
            updated_at: new Date().toISOString(),
          };
          writeJsonFile(getTaskPath(taskId as string), cleanedTask).catch(() => {});
        }).catch(() => {});
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
