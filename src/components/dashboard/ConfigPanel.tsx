
"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Swords, BookOpen, Warehouse, Ghost } from 'lucide-react';

export function ConfigPanel() {
  return (
    <Card className="h-full gothic-border bg-card/50">
      <CardHeader>
        <CardTitle className="text-accent flex items-center gap-2 font-headline">
          <Settings className="w-5 h-5" /> Automation Configuration
        </CardTitle>
        <CardDescription>Define the rituals and behaviors of your automata.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="combat" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-muted/30">
            <TabsTrigger value="combat" className="data-[state=active]:bg-primary"><Swords className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="growth" className="data-[state=active]:bg-primary"><BookOpen className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="inventory" className="data-[state=active]:bg-primary"><Warehouse className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="behavior" className="data-[state=active]:bg-primary"><Ghost className="w-4 h-4" /></TabsTrigger>
          </TabsList>
          
          <TabsContent value="combat" className="space-y-6 pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Battle Manhunt</Label>
                <p className="text-xs text-muted-foreground text-balance">Automatically hunt humans for experience.</p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Grotto Questing</Label>
                <p className="text-xs text-muted-foreground text-balance">Send bot to missions in the Grotto.</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between">
                <Label>Combat Risk Threshold</Label>
                <span className="text-xs text-accent">75% HP</span>
              </div>
              <Slider defaultValue={[75]} max={100} step={1} className="py-2" />
            </div>
          </TabsContent>

          <TabsContent value="growth" className="space-y-6 pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Train Attributes</Label>
                <p className="text-xs text-muted-foreground text-balance">Invest gold into training stats.</p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="space-y-4">
              <Label>Prioritize Training</Label>
              <div className="grid grid-cols-2 gap-2">
                {['Strength', 'Defense', 'Dexterity', 'Agility'].map(stat => (
                  <div key={stat} className="flex items-center gap-2 p-2 border rounded-md text-xs bg-muted/20">
                    <input type="checkbox" defaultChecked />
                    <span>{stat}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6 pt-4">
             <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Repair Equipment</Label>
                <p className="text-xs text-muted-foreground text-balance">Repair gear when durability drops below 10%.</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Sell Junk</Label>
                <p className="text-xs text-muted-foreground text-balance">Sell common items automatically.</p>
              </div>
              <Switch />
            </div>
          </TabsContent>

          <TabsContent value="behavior" className="space-y-6 pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Stealth Mode</Label>
                <p className="text-xs text-muted-foreground text-balance">Add random delays between actions to mimic human behavior.</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between">
                <Label>Stamina Save Reserve</Label>
                <span className="text-xs text-accent">10 Points</span>
              </div>
              <Slider defaultValue={[10]} max={50} step={1} className="py-2" />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
