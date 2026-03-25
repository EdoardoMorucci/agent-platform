# Agently.ai — Agent Management Platform

## Progetto

Piattaforma web single-user locale per creare, configurare, orchestrare e monitorare team di agenti AI basati su Claude Code CLI + Amazon Bedrock.

## Design Spec

`docs/superpowers/specs/2026-03-25-agently-design.md`

## Piani di Implementazione

- **Plan 1 (Foundation + Kanban):** `docs/superpowers/plans/2026-03-25-foundation-kanban.md` — PRONTO PER ESECUZIONE
- **Plan 2 (Agents + Execution):** da scrivere dopo Plan 1
- **Plan 3 (Teams, Skills + AI Generation):** da scrivere dopo Plan 2

## Architettura

- **Frontend:** Next.js 14 (App Router) + Tailwind + shadcn/ui
- **Backend:** Next.js API routes (stesso progetto)
- **Persistenza:** File JSON in `data/` — nessun DB
- **Streaming:** SSE per output agenti
- **Esecuzione agenti:** `child_process.spawn('claude', ...)` con `AWS_PROFILE=bedrock`

## Configurazione AWS

- Profilo: `bedrock`
- Region: `eu-west-1`
- Modelli:
  - Opus: `eu.anthropic.claude-opus-4-6-v1`
  - Sonnet: `eu.anthropic.claude-sonnet-4-6`

## Git

- User: EdoardoMorucci
- Email: edoardomorucci@gmail.com

## Convenzioni

- Dark mode, stile developer tool
- Layout: top bar (logo + nav tabs) + sidebar sinistra (Agents/Teams/Skills/Settings) + area centrale (Kanban)
- Kanban 5 colonne fisse: Backlog → To Do → In Progress → Review → Done
- Tutti i dati in `data/` (agents, teams, skills, tasks) come JSON versionati in git
- Il frontend design va sviluppato con la skill `frontend-design`
