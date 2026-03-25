"use client";

import { Board } from "@/components/kanban/board";

export default function Home() {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-100">Kanban</h1>
      </div>
      <div className="flex-1 overflow-hidden">
        <Board />
      </div>
    </div>
  );
}
