"use client";

import dynamic from "next/dynamic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Terminal, Crosshair } from "lucide-react";

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

export default function ChroniclesPage() {
  return (
    <div className="space-y-6 h-[calc(100vh-180px)] animate-in fade-in slide-in-from-bottom-4">
      <h1 className="text-3xl font-headline text-accent">Chronicles</h1>
      <Tabs defaultValue="log" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted/30">
          <TabsTrigger
            value="log"
            className="data-[state=active]:bg-primary gap-2"
          >
            <Terminal className="w-4 h-4" /> Ritual Log
          </TabsTrigger>
          <TabsTrigger
            value="pvp"
            className="data-[state=active]:bg-primary gap-2"
          >
            <Crosshair className="w-4 h-4" /> Shadow Marks
          </TabsTrigger>
        </TabsList>
        <TabsContent value="log">
          <ActivityLog />
        </TabsContent>
        <TabsContent value="pvp">
          <PvPTargets />
        </TabsContent>
      </Tabs>
    </div>
  );
}
