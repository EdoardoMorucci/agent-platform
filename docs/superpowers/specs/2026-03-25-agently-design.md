# Agently.ai — Design Spec

**Date:** 2026-03-25
**Status:** Approved
**Repo:** `C:\Users\e.morucci\Desktop\Project\X Personal Projects\agents-platform`

---

## Overview

Agently.ai è una piattaforma web single-user locale per creare, configurare, orchestrare e monitorare team di agenti AI. Il centro dell'esperienza è un **Kanban board**: i task si muovono tra colonne fisse e lo spostamento in "In Progress" triggera automaticamente il team di agenti associato. Ogni agente è un'istanza di Claude Code CLI lanciata on-demand, configurata con Amazon Bedrock (profilo AWS `bedrock`, region `eu-west-1`).

---

## Goals

- Kanban come interfaccia principale per gestire e lanciare lavoro agli agenti
- Agenti configurabili con CLAUDE.md, skills, modello Bedrock
- Team configurabili con modalità di collaborazione: sequenziale, parallelo, orchestrato
- Generazione AI-assistita di prompt agente e struttura team (via Bedrock, con approvazione utente)
- Skills installabili dal marketplace `anthropics/claude-plugins-official` o create custom
- Visibilità in tempo reale di cosa fa ogni agente (output + reasoning)
- Loop iterativo review → feedback → re-run con contesto configurabile

---

## Layout e Navigazione

```
┌──────────────┬──────────────────────────────────────────────────────┐
│  Agently.ai  │  [ Kanban ]  [ Coming Soon ]                        │
├──────────────┼──────────────────────────────────────────────────────┤
│              │                                                      │
│   SIDEBAR    │                  KANBAN BOARD                        │
│   (fisso)    │                                                      │
│              │  Backlog │ To Do │ In Progress │ Review │ Done       │
│  > Agents    │  ┌─────┐ │┌─────┐│  ┌─────┐   │┌─────┐ │            │
│  > Teams     │  │Task1│ ││Task3││  │Task5│   ││Task7│ │            │
│  > Skills    │  │     │ ││     ││  │ ⚡🔄│   ││ ✓   │ │            │
│  > Settings  │  └─────┘ │└─────┘│  └─────┘   │└─────┘ │            │
│              │           │       │             │        │            │
└──────────────┴──────────────────────────────────────────────────────┘
```

**Top bar (full width, divisa in due zone):**
- **Zona sinistra (sopra la sidebar):** Nome progetto `Agently.ai` — logo/wordmark, fisso
- **Zona destra (sopra il kanban):** Tab di navigazione principale
  - `Kanban` — vista attiva (board con le colonne)
  - `Coming Soon` — placeholder per future viste (es. Graph, Analytics, ecc.), non cliccabile o con tooltip "In arrivo"
- La top bar ha la stessa altezza su tutta la larghezza, con un separatore verticale allineato al bordo della sidebar

**Sidebar (sempre visibile):**
- **Agents** — CRUD agenti, dettaglio, CLAUDE.md, modello, skills assegnate
- **Teams** — CRUD team, composizione agenti, modalità collaborazione, mapping tipo→team
- **Skills** — Libreria: marketplace `anthropics/claude-plugins-official` + skills custom
- **Settings** — Conferma profilo AWS `bedrock`, modello default, path Claude Code CLI

---

## Kanban e Flusso di Esecuzione

### Colonne fisse
`Backlog → To Do → In Progress → Review → Done`

### Task card
- Titolo + descrizione
- Tipo (es. `code-review`, `bugfix`, `report`) — determina il team di default
- Team assegnato (override manuale opzionale)
- Modalità re-run: `continue` (contesto precedente) o `fresh` (da zero)
- History esecuzioni collassabile

### Trigger esecuzione (task → In Progress)
1. Backend legge il tipo del task
2. Risolve team: default dal mapping tipo→team, oppure override manuale
3. Prepara contesto:
   - Prompt del task
   - Se modalità `continue`: output esecuzione precedente + note di review
   - Se modalità `fresh`: solo il prompt + note di review
4. Lancia team secondo la sua modalità (seq/parallelo/orchestrato)
5. Output in streaming visibile aprendo il task card
6. Al termine: task si sposta automaticamente in "Review"

### Loop iterativo (Review → re-run)
- In Review: vedi output completo, aggiungi note feedback
- Scelta: `Approva → Done` oppure `Rilancia → To Do / In Progress`
- Se rilanciato: scegli `continue` o `fresh`

---

## Agenti

### Struttura su filesystem
```
agents-platform/
└── data/
    └── agents/
        └── <agent-name>/
            ├── CLAUDE.md       (istruzioni, personalità, contesto)
            └── config.json     (modello, working_dir, skills, metadata)
```

### config.json
```json
{
  "id": "uuid",
  "name": "code-reviewer",
  "description": "Analizza codice Python e suggerisce miglioramenti",
  "model": "eu.anthropic.claude-sonnet-4-6",
  "working_dir": "C:/Users/e.morucci/Desktop/Project/X Personal Projects/agents-platform/workspace/code-reviewer",
  "skills": ["skill-name-1", "skill-name-2"],
  "created_at": "2026-03-25T00:00:00Z"
}
```

### Modelli disponibili
| Label UI | Model ID |
|---|---|
| Claude Opus 4.6 | `eu.anthropic.claude-opus-4-6-v1` |
| Claude Sonnet 4.6 | `eu.anthropic.claude-sonnet-4-6` |

### Creazione agente — due modalità
1. **Manuale:** Form completo con editor markdown per CLAUDE.md
2. **Assistita (tasto "Genera"):** Scrivi frase semplice → backend chiama Bedrock API → propone CLAUDE.md completo → revisioni + conferma

### Agent Inspector (click su agente attivo)
- Panel laterale con output in streaming riga per riga
- Sezione "Ragionamenti": thinking process, tool calls, decisioni intermedie
- Indicatore tool attivo in tempo reale (es. `Read`, `Bash`, `Agent…`)

---

## Team

### Struttura su filesystem
```
data/
└── teams/
    └── <team-name>/
        └── config.json
```

### config.json
```json
{
  "id": "uuid",
  "name": "fullstack-team",
  "agents": ["agent-id-1", "agent-id-2", "agent-id-3"],
  "mode": "sequential",        // "sequential" | "parallel" | "orchestrated"
  "orchestrator_agent": null,   // solo per mode: orchestrated
  "task_types": ["feature-dev", "bugfix"],
  "created_at": "2026-03-25T00:00:00Z"
}
```

### Modalità di collaborazione
| Modalità | Comportamento |
|---|---|
| **Sequential** | Agente 1 → output → Agente 2 → output → … → risultato finale |
| **Parallel** | Tutti ricevono lo stesso input, lavorano insieme, agente "merger" combina |
| **Orchestrated** | Un agente leader decide chi chiamare, quando, con quale input |

### Creazione team — due modalità
1. **Manuale:** Form + selezione agenti + scelta modalità + mapping tipi
2. **Assistita (tasto "Genera"):** Scrivi descrizione team → Bedrock propone agenti, struttura, grafo di comunicazione → **review e approvazione prima di creare qualsiasi cosa**

---

## Skills

### Sorgenti
1. **Marketplace:** Skills da `anthropics/claude-plugins-official` — sfogliabili, installabili con un click (copiati in `data/skills/marketplace/`)
2. **Custom:** Create dall'utente con nome, descrizione/trigger, editor SKILL.md

### Struttura su filesystem
```
data/
└── skills/
    ├── marketplace/
    │   └── <skill-name>/
    │       └── SKILL.md
    └── custom/
        └── <skill-name>/
            └── SKILL.md
```

### Assegnazione
- Ogni skill è globale e assegnabile a qualsiasi agente
- Al lancio di un agente, le sue skills vengono linkate nella working directory: `<working_dir>/skills/<skill-name>/SKILL.md`

---

## Architettura Tecnica

### Stack
- **Frontend:** Next.js 14 (App Router) + Tailwind + shadcn/ui — sviluppato con skill `frontend-design`
- **Backend:** Next.js API routes (stesso progetto)
- **Persistenza:** File JSON nella repo (`data/`) — versionati in git, leggibili/modificabili a mano
- **Streaming:** Server-Sent Events (SSE) per output agenti in tempo reale

### Struttura repo completa
```
agents-platform/
├── src/
│   ├── app/              (Next.js App Router — UI)
│   │   ├── page.tsx      (Kanban board — home)
│   │   ├── agents/       (gestione agenti)
│   │   ├── teams/        (gestione team)
│   │   ├── skills/       (libreria skills)
│   │   └── settings/     (configurazione)
│   └── api/              (API routes)
│       ├── agents/
│       ├── teams/
│       ├── skills/
│       ├── tasks/
│       ├── execute/      (lancia agenti, SSE streaming)
│       └── generate/     (Bedrock API per generazione AI-assistita)
├── data/
│   ├── agents/
│   ├── teams/
│   ├── skills/
│   │   ├── marketplace/
│   │   └── custom/
│   └── tasks/
├── config.json           (settings globali)
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-03-25-agently-design.md
```

### Esecuzione agenti
```js
child_process.spawn('claude', ['--model', agent.model, '-p', prompt], {
  env: {
    ...process.env,
    AWS_PROFILE: 'bedrock',
    AWS_REGION: 'eu-west-1',
    CLAUDE_CODE_USE_BEDROCK: '1',
  },
  cwd: agent.working_dir,
})
```

### Generazione AI-assistita
- Chiamata diretta a Bedrock via `@aws-sdk/client-bedrock-runtime` con profilo `bedrock`
- Usata per: espandere frase → CLAUDE.md agente, e frase → struttura team
- Sempre con preview + approvazione utente prima di qualsiasi salvataggio

### Comunicazione inter-agent
- Backend intercetta `@agent:nome` nell'output dell'orchestratore
- Verifica che l'agente target sia nel grafo di comunicazione del team
- Lancia il subagente e inietta il suo output nel contesto dell'orchestratore

---

## Configurazione globale (config.json)
```json
{
  "aws_profile": "bedrock",
  "aws_region": "eu-west-1",
  "default_model": "eu.anthropic.claude-sonnet-4-6",
  "claude_cli_path": "claude"
}
```

---

## Non in Scope (MVP)

- Autenticazione / multi-user
- Deployment cloud o containerizzazione
- Integrazioni esterne (Slack, GitHub, ecc.)
- Editor visuale di pipeline stile n8n
- Rate limiting / gestione quote Bedrock
- Versioning agenti
- Schedulazione automatica (cron)

---

## Open Questions

1. Il grafo di comunicazione tra agenti è definito a livello di team (chi può parlare con chi dentro il team) o è globale tra tutti gli agenti?
2. L'output delle esecuzioni va salvato tutto su disco o solo un estratto? Esecuzioni lunghe possono produrre molto testo.
3. Per la modalità "parallel", chi è l'agente "merger"? Va definito esplicitamente nel team o è un agente speciale auto-generato?
