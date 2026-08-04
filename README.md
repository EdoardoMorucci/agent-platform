# Agently.ai — Agent Management Platform

A local-first web platform for creating, configuring, and orchestrating AI agents powered by **Amazon Bedrock** (Claude). Work is managed through a **Kanban board**: drag a task to **In Progress** and the assigned agent runs with streaming output, conversation history, and human-in-the-loop review.

Built as a single-user developer tool — no cloud deployment required beyond AWS Bedrock access.

---

## Problem

Running multiple specialized AI agents (code review, bugfix, research, etc.) from the terminal does not scale: there is no shared task queue, no visibility into runs, and no structured review loop. Agently.ai wraps agent execution in a Kanban workflow so you can assign agents to tasks, watch output stream in real time, leave feedback, and re-run with or without prior context.

---

## Features

### Implemented

- **Kanban board** — fixed columns: Backlog → To Do → In Progress → Review → Done
- **Drag-and-drop tasks** — moving a task to In Progress triggers agent execution
- **Agent CRUD** — create agents with name, description, Bedrock model, and `CLAUDE.md` system prompt
- **Streaming execution** — Server-Sent Events (SSE) from `/api/execute` with live output in a dialog
- **Conversation modes** — `continue` (full history replay) or `fresh` (start over)
- **Human-in-the-loop** — review output, add feedback, re-run from Review
- **Execution history** — per-task run log with status, timestamps, and output
- **File-based persistence** — agents and tasks stored as JSON under `data/`

### Planned

- **Teams** — sequential, parallel, and orchestrated multi-agent workflows
- **Skills marketplace** — install skills from `anthropics/claude-plugins-official` or create custom ones
- **Docker sandbox** — isolated agent execution via containerized Claude Code CLI
- **AI-assisted setup** — generate agent prompts and team structures via Bedrock

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js App (React 19)                  │
│  ┌──────────┐  ┌─────────────────────────────────────────┐  │
│  │ Sidebar  │  │              Kanban Board               │  │
│  │ Agents   │  │  Backlog │ To Do │ In Progress │ ...   │  │
│  └──────────┘  └─────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST + SSE
┌──────────────────────────▼──────────────────────────────────┐
│                    API Routes (App Router)                  │
│  /api/tasks   /api/agents   /api/execute (SSE stream)       │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   data/tasks/      data/agents/     @anthropic-ai/bedrock-sdk
   (JSON files)     (config +        (Claude via AWS Bedrock)
                     CLAUDE.md)
```

**Execution flow**

1. User assigns an agent to a task and drags it to **In Progress**.
2. Frontend opens an output dialog and connects to `GET /api/execute?task_id=…`.
3. Backend loads task + agent config, builds the message array (with optional history), and streams from Bedrock.
4. Tokens are pushed over SSE; the result is persisted to `data/tasks/<id>.json`.
5. User reviews output in **Review**, approves to **Done**, or re-runs with feedback.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, shadcn/ui, Base UI |
| Drag & drop | @dnd-kit |
| Data fetching | SWR |
| AI | `@anthropic-ai/bedrock-sdk` → Amazon Bedrock (Claude Opus / Sonnet / Haiku) |
| Persistence | Local JSON files (`data/`) |
| Container (WIP) | Docker + dockerode + xterm.js |

---

## Prerequisites

- **Node.js 20+**
- **AWS account** with Bedrock access and Claude models enabled in your region
- **AWS CLI profile** configured (see [Environment variables](#environment-variables))

---

## Setup

```bash
# Clone
git clone https://github.com/EdoardoMorucci/agent-platform.git
cd agent-platform

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your AWS profile and region

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### AWS Bedrock

1. Enable Claude models in the [Amazon Bedrock console](https://console.aws.amazon.com/bedrock/) for your region (default: `eu-west-1`).
2. Create a named AWS profile (e.g. `bedrock`) in `~/.aws/credentials`:

```ini
[bedrock]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_SECRET_KEY
```

Alternatively, use `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` environment variables or an IAM role.

Application defaults live in `config.json`:

```json
{
  "aws_profile": "bedrock",
  "aws_region": "eu-west-1",
  "default_model": "eu.anthropic.claude-sonnet-4-6",
  "claude_cli_path": "claude"
}
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AWS_PROFILE` | Yes* | `bedrock` | Named AWS profile for Bedrock credentials |
| `AWS_REGION` | Yes | `eu-west-1` | AWS region where Bedrock models are enabled |
| `PORT` | No | `3000` | Dev server port |

\* Or use standard AWS credential env vars / IAM role instead of a profile.

Copy `.env.example` to `.env.local` and adjust values for your setup.

---

## Docker (Work in Progress)

A base image for running Claude Code CLI inside a container is included for upcoming sandboxed execution:

```bash
# Build the agent image
docker build -t agently-claude -f docker/Dockerfile docker/

# Run interactively (mount your workspace)
docker run -it --rm \
  -v "$(pwd)/workspace:/workspace" \
  -v "$HOME/.aws:/root/.aws:ro" \
  -e AWS_PROFILE=bedrock \
  -e AWS_REGION=eu-west-1 \
  -e CLAUDE_CODE_USE_BEDROCK=1 \
  agently-claude
```

Full Docker-based execution with PTY terminal streaming is planned on the `docker-implementation` branch.

---

## Project Structure

```
agent-platform/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── agents/          # Agent CRUD + CLAUDE.md editor
│   │   │   ├── tasks/           # Task CRUD
│   │   │   └── execute/         # SSE streaming execution endpoint
│   │   ├── layout.tsx
│   │   └── page.tsx             # Kanban view
│   ├── components/
│   │   ├── agents/              # Agent panel, form, output dialog
│   │   ├── kanban/              # Board, columns, task cards
│   │   ├── layout/              # Shell, sidebar, top bar
│   │   └── ui/                  # shadcn primitives
│   ├── hooks/                   # SWR hooks for agents & tasks
│   └── lib/                     # Types, file I/O helpers
├── data/
│   ├── agents/<id>/             # config.json + CLAUDE.md per agent
│   ├── tasks/                   # One JSON file per task
│   ├── teams/                   # (planned)
│   └── skills/                  # (planned)
├── docker/
│   └── Dockerfile               # Claude Code CLI container image
├── docs/superpowers/            # Design specs and implementation plans
├── config.json                  # App defaults (AWS profile, region, model)
├── .env.example
└── package.json
```

---

## Available Bedrock Models

| UI Label | Model ID |
|----------|----------|
| Claude Opus 4.6 | `eu.anthropic.claude-opus-4-6-v1` |
| Claude Sonnet 4.6 | `eu.anthropic.claude-sonnet-4-6` |
| Claude Haiku 4.5 | `eu.anthropic.claude-haiku-4-5-20251001` |

Model IDs use EU cross-region inference profiles. Adjust in `src/lib/types.ts` if your region differs.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

---

## License

No license file is included yet. All rights reserved unless otherwise specified.
