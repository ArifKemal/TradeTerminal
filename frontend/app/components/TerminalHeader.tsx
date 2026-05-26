"use client";

import { useRouter } from "next/navigation";

interface TerminalHeaderProps {
  status: "connected" | "disconnected" | "loading";
}

export default function TerminalHeader({ status }: TerminalHeaderProps) {
  const router = useRouter();
  const statusColor = {
    connected: "bg-emerald-500",
    disconnected: "bg-red-500",
    loading: "bg-amber-500",
  }[status];

  return (
    <header className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)] px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
            <span className="text-[var(--accent-orange)] text-lg font-bold">{">"}</span>
            <h1 className="text-lg font-bold tracking-wider text-[var(--text-primary)]">
              Trade<span className="text-[var(--accent-orange)]">Terminal</span>
            </h1>
          </div>
          <span className="text-[var(--text-muted)] text-xs">v1.1.0</span>
          <span className="text-[var(--text-muted)] text-xs">|</span>
          <span className="text-[var(--text-muted)] text-xs">VectorBT Engine</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${statusColor}`} />
          <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">
            {status === "connected" ? "ONLINE" : status === "loading" ? "CONNECTING" : "OFFLINE"}
          </span>
        </div>
      </div>
    </header>
  );
}
