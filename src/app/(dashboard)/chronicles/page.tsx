"use client";

import dynamic from "next/dynamic";
import { Terminal } from "lucide-react";

const ActivityLog = dynamic(
  () => import("@/components/dashboard/ActivityLog").then((m) => m.ActivityLog),
  {
    loading: () => (
      <div className="h-64 flex items-center justify-center animate-pulse">
        Loading...
      </div>
    ),
  },
);

export default function ChroniclesPage() {
  return (
    <div className="space-y-6 h-[calc(100vh-180px)] animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3">
        <Terminal className="w-8 h-8 text-accent" />
        <h1 className="text-3xl font-headline text-accent">Chronicles</h1>
      </div>
      <ActivityLog />
    </div>
  );
}
