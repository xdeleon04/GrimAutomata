"use client";

import { useMemo, useState } from "react";
import {
  Coins,
  Crosshair,
  Loader2,
  Skull,
  TrendingUp,
  ArrowUpDown,
} from "lucide-react";

import { usePvPVictories } from "@/components/dashboard/DashboardDataProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type SortField =
  | "rivalName"
  | "rivalRace"
  | "wins"
  | "totalGoldLooted"
  | "totalXpEarned"
  | "lastBattleDate";
type SortDirection = "asc" | "desc";

interface PvPTargetsProps {
  manualPvpStatus?: {
    currentTargetId: string;
    currentTargetName: string;
    targetIndex: number;
    totalTargets: number;
    attempted: string[];
  } | null;
}

export default function PvPTargets({ manualPvpStatus }: PvPTargetsProps) {
  const { data: rivals, isLoading, error } = usePvPVictories();
  const [sortField, setSortField] = useState<SortField>("wins");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sortedRivals = useMemo(() => {
    if (!rivals) return [];

    return [...rivals].sort((a, b) => {
      let aVal: string | number | undefined = a[sortField];
      let bVal: string | number | undefined = b[sortField];

      // Handle specific fields
      if (sortField === "rivalRace") {
        aVal = aVal || "";
        bVal = bVal || "";
      }

      if (aVal === undefined && bVal === undefined) return 0;
      if (aVal === undefined) return 1;
      if (bVal === undefined) return -1;

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [rivals, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  if (isLoading) {
    return (
      <Card className="gothic-border bg-card/50 h-full">
        <CardHeader className="pb-2">
          <CardTitle className="font-headline tracking-widest text-[#d8d8d8] flex items-center gap-2 text-sm uppercase">
            <Crosshair className="h-4 w-4 text-accent" />
            Shadow Mark Ledger
          </CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-accent/50" />
          <p className="font-mono text-[10px] text-muted-foreground animate-pulse uppercase tracking-wider">
            Scanning Realm...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="gothic-border bg-card/50 h-full border-red-900/40">
        <CardHeader className="pb-2">
          <CardTitle className="font-headline text-red-500/80 flex items-center gap-2 text-sm uppercase">
            <Skull className="h-4 w-4" />
            Connection Severed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-[10px] text-red-400/60">
            Failed to retrieve mark ledger. The spirits are silent.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gothic-border bg-card/50 h-[65vh] min-h-[500px] flex flex-col">
      <CardHeader className="pb-3 border-b border-border/40">
        <CardTitle className="font-headline tracking-widest text-[#d8d8d8] flex items-center gap-2 text-sm uppercase">
          <Crosshair className="h-4 w-4 text-accent" />
          Shadow Mark Ledger
          {manualPvpStatus?.currentTargetName ? (
            <span className="ml-auto font-mono text-[10px] text-accent animate-pulse normal-case tracking-normal">
              Targeting: {manualPvpStatus.currentTargetName} (
              {manualPvpStatus.targetIndex}/{manualPvpStatus.totalTargets})
            </span>
          ) : (
            rivals && (
              <span className="ml-auto font-mono text-[10px] text-muted-foreground normal-case tracking-normal">
                {rivals.length} targets
              </span>
            )
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0 relative">
        {!rivals || rivals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-center p-6 gap-3">
            <Skull className="h-8 w-8 text-muted-foreground/30" />
            <p className="font-mono text-[11px] text-muted-foreground/60 max-w-[200px]">
              No blood marks recorded. Engage in PvP combat to populate the
              ledger.
            </p>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {/* Table Header - Fixed */}
            <div className="bg-card/30 border-b border-border/40 px-4 py-2 grid grid-cols-12 gap-2 text-[10px] font-mono text-muted-foreground uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm">
              <div
                className="col-span-3 cursor-pointer hover:text-accent transition-colors flex items-center gap-1"
                onClick={() => toggleSort("rivalName")}
              >
                Rival
                {sortField === "rivalName" && (
                  <ArrowUpDown className="h-3 w-3 opacity-50" />
                )}
              </div>
              <div
                className="col-span-2 cursor-pointer hover:text-accent transition-colors flex items-center gap-1"
                onClick={() => toggleSort("rivalRace")}
              >
                Race
                {sortField === "rivalRace" && (
                  <ArrowUpDown className="h-3 w-3 opacity-50" />
                )}
              </div>
              <div
                className="col-span-2 text-right cursor-pointer hover:text-accent transition-colors flex items-center justify-end gap-1"
                onClick={() => toggleSort("wins")}
              >
                <TrendingUp className="h-3 w-3 text-muted-foreground/70" />
                Wins
                {sortField === "wins" && (
                  <ArrowUpDown className="h-3 w-3 opacity-50" />
                )}
              </div>
              <div
                className="col-span-2 text-right cursor-pointer hover:text-accent transition-colors flex items-center justify-end gap-1"
                onClick={() => toggleSort("totalGoldLooted")}
              >
                <Coins className="h-3 w-3 text-muted-foreground/70" />
                loot
                {sortField === "totalGoldLooted" && (
                  <ArrowUpDown className="h-3 w-3 opacity-50" />
                )}
              </div>
              <div
                className="col-span-3 text-right cursor-pointer hover:text-accent transition-colors flex items-center justify-end gap-1"
                onClick={() => toggleSort("lastBattleDate")}
              >
                Last Hunt
                {sortField === "lastBattleDate" && (
                  <ArrowUpDown className="h-3 w-3 opacity-50" />
                )}
              </div>
            </div>

            {/* Scrollable List */}
            <ScrollArea className="flex-1">
              <div className="flex flex-col">
                {sortedRivals.map((rival) => {
                  const isCurrentTarget =
                    manualPvpStatus?.currentTargetId === rival.rivalGameId;
                  const isAttempted = manualPvpStatus?.attempted.includes(
                    rival.rivalGameId,
                  );
                  const isSkipped = isAttempted && !isCurrentTarget;

                  return (
                    <div
                      key={rival.id}
                      className={cn(
                        "grid grid-cols-12 gap-2 px-4 py-2 border-b border-border/20 text-[11px] font-mono transition-colors group items-center",
                        isCurrentTarget
                          ? "bg-accent/5 border-l-2 border-accent animate-pulse"
                          : "hover:bg-white/5",
                        isSkipped ? "opacity-50 decoration-slate-500" : "",
                      )}
                    >
                      <div className="col-span-3 font-medium text-foreground truncate group-hover:text-accent transition-colors flex items-center gap-1">
                        {isCurrentTarget && (
                          <Crosshair className="w-3 h-3 text-accent inline-block" />
                        )}
                        <span className={isSkipped ? "line-through" : ""}>
                          {rival.rivalName}
                        </span>
                        <div className="text-[9px] text-muted-foreground/50">
                          #{rival.rivalGameId}
                        </div>
                      </div>
                      <div className="col-span-2 text-muted-foreground trunacte">
                        {rival.rivalRace || "Unknown"}
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="text-accent">{rival.wins}</span>
                        <span className="text-muted-foreground/40 ml-1">/</span>
                        <span className="text-red-400/60 ml-1">
                          {rival.losses}
                        </span>
                      </div>
                      <div className="col-span-2 text-right text-[#d4af37]/90 truncate">
                        {rival.totalGoldLooted.toLocaleString()}
                      </div>
                      <div className="col-span-3 text-right text-muted-foreground/80 flex flex-col items-end leading-none gap-0.5">
                        <span>
                          {new Date(rival.lastBattleDate).toLocaleDateString()}
                        </span>
                        <span
                          className={cn(
                            "text-[9px] uppercase tracking-tighter px-1 py-0.5 rounded-[2px]",
                            rival.lastResult === "WIN"
                              ? "bg-accent/10 text-accent"
                              : "bg-red-500/10 text-red-400",
                          )}
                        >
                          {rival.lastResult}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
