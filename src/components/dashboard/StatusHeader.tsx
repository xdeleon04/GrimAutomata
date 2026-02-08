"use client";

import React from "react";
import { Play, Square, Activity, Loader2, Bug, BugOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAutomationEngine } from "@/hooks/use-automation-engine";

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function StatusHeader() {
  const {
    isRunning,
    uptime,
    isSyncing,
    debugMode,
    cooldown,
    cooldownReason,
    credentials,
    handleToggle,
    setDebugMode,
  } = useAutomationEngine();

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 bg-card/50 border-b gothic-border rounded-t-lg">
      <div className="flex items-center gap-4 mb-4 sm:mb-0">
        <div
          role="status"
          aria-label={isRunning ? "System active" : "System standby"}
          className={cn(
            "w-3 h-3 rounded-full",
            isRunning ? "bg-green-500 animate-pulse" : "bg-red-500",
          )}
        />
        <div>
          <h1 className="text-2xl font-headline font-bold text-accent">
            GrimAutomata Engine
          </h1>
          <p className="text-sm text-muted-foreground">
            {isRunning
              ? `System active - Uptime: ${formatTime(uptime)}`
              : "System standby"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="hidden lg:flex items-center gap-6 mr-6 text-sm">
          {(isSyncing || cooldown > 0) && (
            <div className="flex items-center gap-2 text-orange-400">
              {isSyncing && <Loader2 className="w-4 h-4 animate-spin" />}
              {cooldown > 0 && <Activity className="w-4 h-4 animate-pulse" />}
              <span>
                {cooldown > 0
                  ? `Cooldown: ${formatTime(cooldown)}`
                  : "Invoking Ritual..."}
                {cooldownReason && cooldown > 0 && (
                  <span className="text-muted-foreground ml-1">
                    ({cooldownReason})
                  </span>
                )}
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            aria-label={debugMode ? "Disable debug mode" : "Enable debug mode"}
            onClick={() => setDebugMode(!debugMode)}
            className={cn(
              "text-[10px] uppercase tracking-widest gap-2",
              debugMode ? "text-purple-400" : "text-muted-foreground",
            )}
          >
            {debugMode ? (
              <Bug className="w-3 h-3" />
            ) : (
              <BugOff className="w-3 h-3" />
            )}
            Shadow: {debugMode ? "VERBOSE" : "SILENT"}
          </Button>
        </div>

        <Button
          variant={isRunning ? "destructive" : "default"}
          aria-label={
            isRunning ? "Stop automation ritual" : "Start automation ritual"
          }
          onClick={handleToggle}
          disabled={!credentials && !isRunning}
          className={cn(
            "flex-1 sm:flex-none gap-2 px-8 font-bold uppercase tracking-wider",
            !isRunning && "bg-accent text-accent-foreground hover:bg-accent/90",
          )}
        >
          {isRunning ? (
            <>
              <Square className="w-4 h-4 fill-current" /> Stop Ritual
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" /> Start Ritual
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
