"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { AgentPanel } from "@/components/agents/agent-panel";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [activePanel, setActivePanel] = useState<string | null>(null);

  return (
    <div className="flex flex-1 overflow-hidden">
      <Sidebar
        activePanel={activePanel}
        onPanelChange={setActivePanel}
      />
      {activePanel === "agents" && (
        <AgentPanel onClose={() => setActivePanel(null)} />
      )}
      <main className="flex-1 overflow-auto bg-zinc-900 p-6">
        {children}
      </main>
    </div>
  );
}
