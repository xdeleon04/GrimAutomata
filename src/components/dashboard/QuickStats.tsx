
"use client"

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skull, Coins, Zap, Shield } from 'lucide-react';

export function QuickStats() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard 
        label="Character Level" 
        value="45" 
        icon={<Skull className="text-accent w-4 h-4" />} 
        progress={65} 
        progressLabel="XP: 14,200 / 20,000"
      />
      <StatCard 
        label="Blood Gold" 
        value="1,240,500" 
        icon={<Coins className="text-accent w-4 h-4" />} 
      />
      <StatCard 
        label="Stamina" 
        value="82 / 100" 
        icon={<Zap className="text-accent w-4 h-4" />} 
        progress={82}
      />
      <StatCard 
        label="Power Index" 
        value="8,421" 
        icon={<Shield className="text-accent w-4 h-4" />} 
      />
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
