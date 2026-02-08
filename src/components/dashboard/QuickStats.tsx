"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Skull,
  Coins,
  Shield,
  Swords,
  Heart,
  Target,
  Wind,
  Loader2,
} from "lucide-react";
import { useUserProfile } from "@/components/dashboard/DashboardDataProvider";

// Hoisted icon elements to prevent re-creation on each render
const SkullIcon = <Skull className="text-accent w-4 h-4" />;
const CoinsIcon = <Coins className="text-accent w-4 h-4" />;
const HeartIcon4 = <Heart className="text-accent w-4 h-4" />;
const ShieldIcon = <Shield className="text-accent w-4 h-4" />;

const SwordsIcon3 = <Swords className="w-3 h-3" />;
const ShieldIcon3 = <Shield className="w-3 h-3" />;
const TargetIcon3 = <Target className="w-3 h-3" />;
const WindIcon3 = <Wind className="w-3 h-3" />;
const HeartIcon3 = <Heart className="w-3 h-3" />;

export function QuickStats() {
  const { data: userData, isLoading } = useUserProfile();

  if (isLoading) {
    return (
      <div className="h-48 flex items-center justify-center text-accent animate-pulse font-mono text-sm tracking-widest">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> READING SCROLLS...
      </div>
    );
  }

  // Normalize stats with defaults to prevent hydration and null-reference errors
  const stats = {
    race: userData?.race || "Vampire",
    level: userData?.level ?? 0,
    gold: userData?.gold ?? 0,
    blood: userData?.blood ?? 0,
    stamina: userData?.stamina ?? 0,
    maxStamina: userData?.maxStamina ?? 100,
    experience: userData?.experience ?? 0,
    nextLevelExp: userData?.nextLevelExp ?? 100,
    skillAverage: userData?.skillAverage ?? 0,
    attributes: {
      strength: userData?.attributes?.strength ?? 0,
      defense: userData?.attributes?.defense ?? 0,
      dexterity: userData?.attributes?.dexterity ?? 0,
      agility: userData?.attributes?.agility ?? 0,
      constitution: userData?.attributes?.constitution ?? 0,
    },
  };

  const xpProgress =
    stats.nextLevelExp > 0 ? (stats.experience / stats.nextLevelExp) * 100 : 0;
  const xpPercent = Math.min(100, Math.round(xpProgress));
  const staminaProgress =
    stats.maxStamina > 0 ? (stats.stamina / stats.maxStamina) * 100 : 0;
  const staminaPercent = Math.min(100, Math.round(staminaProgress));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={`${stats.race} Level`}
          value={stats.level.toString()}
          icon={SkullIcon}
          progress={xpProgress}
          progressLabel={`XP: ${stats.experience.toLocaleString()} / ${stats.nextLevelExp.toLocaleString()} (${xpPercent}%)`}
        />
        <StatCard
          label="Blood & Gold"
          value={stats.gold.toLocaleString()}
          icon={CoinsIcon}
          progressLabel={`${stats.blood.toLocaleString()} Blood Crystals`}
        />
        <StatCard
          label="Health"
          value={`${stats.stamina} / ${stats.maxStamina}`}
          icon={HeartIcon4}
          progress={staminaProgress}
          progressLabel={`${staminaPercent}%`}
        />
        <StatCard
          label="Shadow Power"
          value={
            stats.skillAverage > 0
              ? stats.skillAverage.toFixed(2)
              : Object.values(stats.attributes)
                  .reduce((a: number, b: number) => a + b, 0)
                  .toString()
          }
          icon={ShieldIcon}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <AttributeMiniCard
          label="STR"
          value={stats.attributes.strength.toString()}
          icon={SwordsIcon3}
        />
        <AttributeMiniCard
          label="DEF"
          value={stats.attributes.defense.toString()}
          icon={ShieldIcon3}
        />
        <AttributeMiniCard
          label="DEX"
          value={stats.attributes.dexterity.toString()}
          icon={TargetIcon3}
        />
        <AttributeMiniCard
          label="AGI"
          value={stats.attributes.agility.toString()}
          icon={WindIcon3}
        />
        <AttributeMiniCard
          label="CON"
          value={stats.attributes.constitution.toString()}
          icon={HeartIcon3}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  progress,
  progressLabel,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  progress?: number;
  progressLabel?: string;
}) {
  return (
    <Card className="gothic-border bg-card/50">
      <CardContent className="pt-4 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-tighter text-muted-foreground">
            {label}
          </span>
          {icon}
        </div>
        <div className="text-xl font-bold font-headline mb-2">{value}</div>
        {progress !== undefined && (
          <div className="space-y-1">
            <Progress value={progress} className="h-1 bg-muted" />
            {progressLabel && (
              <div className="text-[9px] text-muted-foreground text-right">
                {progressLabel}
              </div>
            )}
          </div>
        )}
        {progress === undefined && progressLabel && (
          <div className="text-[9px] text-muted-foreground text-right">
            {progressLabel}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AttributeMiniCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="p-2 rounded gothic-border bg-card/50 flex flex-col items-center justify-center gap-1">
      <div className="flex items-center gap-1 text-[9px] text-muted-foreground uppercase font-mono">
        {icon} {label}
      </div>
      <div className="text-sm font-bold text-accent">{value}</div>
    </div>
  );
}
