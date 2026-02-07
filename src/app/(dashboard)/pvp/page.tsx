"use client";

import dynamic from "next/dynamic";
import { Crosshair } from "lucide-react";

const PvPOverview = dynamic(
  () => import("@/components/dashboard/PvPOverview").then((m) => m.default),
  {
    loading: () => (
      <div className="h-64 flex items-center justify-center animate-pulse">
        Loading...
      </div>
    ),
  },
);

const PvPTargets = dynamic(
  () => import("@/components/dashboard/PvPTargets").then((m) => m.default),
  {
    loading: () => (
      <div className="h-64 flex items-center justify-center animate-pulse">
        Loading...
      </div>
    ),
  },
);

export default function PvPPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3">
        <Crosshair className="w-8 h-8 text-accent" />
        <h1 className="text-3xl font-headline text-accent">Shadow Marks</h1>
      </div>
      <PvPOverview />
      <PvPTargets />
    </div>
  );
}
