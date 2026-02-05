
"use client"

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skull, Coins, Zap, Shield, Swords, Heart, Target, Wind, Loader2 } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

export function QuickStats() {
  const { user } = useUser();
  const db = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: userData, isLoading } = useDoc(userDocRef);

  if (isLoading) {
    return (
      <div className="h-48 flex items-center justify-center text-accent animate-pulse font-mono text-sm tracking-widest">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> READING SCROLLS...
      </div>
    );
  }

  // Normalize stats with defaults to prevent hydration and null-reference errors
  const stats = {
    race: userData?.race || 'Vampire',
    level: userData?.level ?? 0,
    gold: userData?.gold ?? 0,
    stamina: userData?.stamina ?? 0,
    maxStamina: userData?.maxStamina ?? 100,
    experience: userData?.experience ?? 0,
    nextLevelExp: userData?.nextLevelExp ?? 100,
    attributes: {
      strength: userData?.attributes?.strength ?? 0,
      defense: userData?.attributes?.defense ?? 0,
      dexterity: userData?.attributes?.dexterity ?? 0,
      agility: userData?.attributes?.agility ?? 0,
      constitution: userData?.attributes?.constitution ?? 0,
    }
  };

  const xpProgress = stats.nextLevelExp > 0 ? (stats.experience / stats.nextLevelExp) * 100 : 0;
  const staminaProgress = stats.maxStamina > 0 ? (stats.stamina / stats.maxStamina) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label={`${stats.race} Level`} 
          value={stats.level.toString()} 
          icon={<Skull className="text-accent w-4 h-4" />} 
          progress={xpProgress} 
          progressLabel={`XP: ${stats.experience.toLocaleString()} / ${stats.nextLevelExp.toLocaleString()}`}
        />
        <StatCard 
          label="Blood Gold" 
          value={stats.gold.toLocaleString()} 
          icon={<Coins className="text-accent w-4 h-4" />} 
        />
        <StatCard 
          label="Stamina" 
          value={`${stats.stamina} / ${stats.maxStamina}`} 
          icon={<Zap className="text-accent w-4 h-4" />} 
          progress={staminaProgress}
        />
        <StatCard 
          label="Shadow Power" 
          value={(Object.values(stats.attributes).reduce((a: number, b: number) => a + b, 0)).toString()} 
          icon={<Shield className="text-accent w-4 h-4" />} 
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <AttributeMiniCard label="STR" value={stats.attributes.strength.toString()} icon={<Swords className="w-3 h-3" />} />
        <AttributeMiniCard label="DEF" value={stats.attributes.defense.toString()} icon={<Shield className="w-3 h-3" />} />
        <AttributeMiniCard label="DEX" value={stats.attributes.dexterity.toString()} icon={<Target className="w-3 h-3" />} />
        <AttributeMiniCard label="AGI" value={stats.attributes.agility.toString()} icon={<Wind className="w-3 h-3" />} />
        <AttributeMiniCard label="CON" value={stats.attributes.constitution.toString()} icon={<Heart className="w-3 h-3" />} />
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, progress, progressLabel }: { 
  label: string, 
  value: string, 
  icon: React.ReactNode,
  progress?: number,
  progressLabel?: string
}) {
  return (
    <Card className="gothic-border bg-card/40 border-primary/20">
      <CardContent className="pt-4 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-tighter text-muted-foreground">{label}</span>
          {icon}
        </div>
        <div className="text-xl font-bold font-headline mb-2">{value}</div>
        {progress !== undefined && (
          <div className="space-y-1">
            <Progress value={progress} className="h-1 bg-muted" />
            {progressLabel && <div className="text-[9px] text-muted-foreground text-right">{progressLabel}</div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AttributeMiniCard({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="p-2 rounded border bg-card/30 flex flex-col items-center justify-center gap-1">
      <div className="flex items-center gap-1 text-[9px] text-muted-foreground uppercase font-mono">
        {icon} {label}
      </div>
      <div className="text-sm font-bold text-accent">{value}</div>
    </div>
  );
}
