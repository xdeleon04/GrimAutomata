
"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Swords, BookOpen, Warehouse, Ghost, MapPin } from 'lucide-react';

export function ConfigPanel() {
  return (
    <Card className="h-full gothic-border bg-card/50">
      <CardHeader>
        <CardTitle className="text-accent flex items-center gap-2 font-headline">
          <Settings className="w-5 h-5" /> Ritual Configuration
        </CardTitle>
        <CardDescription>Configure your bot's automated actions in the Shadow Realm.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="combat" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-muted/30">
            <TabsTrigger value="combat" className="data-[state=active]:bg-primary"><Swords className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="growth" className="data-[state=active]:bg-primary"><BookOpen className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="missions" className="data-[state=active]:bg-primary"><MapPin className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="behavior" className="data-[state=active]:bg-primary"><Ghost className="w-4 h-4" /></TabsTrigger>
          </TabsList>
          
          <TabsContent value="combat" className="space-y-6 pt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Manhunt</Label>
                  <p className="text-xs text-muted-foreground">Hunt humans for gold and XP.</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">Hunt Duration (Minutes)</Label>
                <Select defaultValue="60">
                  <SelectTrigger className="h-8 bg-background/50">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 Minutes (Min)</SelectItem>
                    <SelectItem value="30">30 Minutes</SelectItem>
                    <SelectItem value="60">60 Minutes</SelectItem>
                    <SelectItem value="120">120 Minutes (Max)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>PVP: Attack Opponents</Label>
                  <p className="text-xs text-muted-foreground">Automatically attack members of the opposite race.</p>
                </div>
                <Switch />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="growth" className="space-y-6 pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Training</Label>
                <p className="text-xs text-muted-foreground">Spend gold on character attributes.</p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Attribute Priority</Label>
              <div className="grid grid-cols-1 gap-2">
                {['Strength', 'Defense', 'Dexterity', 'Agility', 'Constitution'].map(stat => (
                  <div key={stat} className="flex items-center justify-between p-2 border rounded-md text-xs bg-muted/20">
                    <span>{stat}</span>
                    <Switch size="sm" defaultChecked />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="missions" className="space-y-6 pt-4">
             <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Ancestral Grotto</Label>
                <p className="text-xs text-muted-foreground">Automate PvE missions.</p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs">Mission Difficulty</Label>
              <Select defaultValue="medium">
                <SelectTrigger className="h-8 bg-background/50">
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy (Safe XP)</SelectItem>
                  <SelectItem value="medium">Medium (Balanced)</SelectItem>
                  <SelectItem value="hard">Hard (High Risk)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between">
                <Label className="text-xs">HP Retreat Threshold</Label>
                <span className="text-xs text-accent">50% HP</span>
              </div>
              <Slider defaultValue={[50]} max={90} step={1} className="py-2" />
            </div>
          </TabsContent>

          <TabsContent value="behavior" className="space-y-6 pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Shadow Stealth</Label>
                <p className="text-xs text-muted-foreground">Anti-detection delays between rituals.</p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Repair Gear</Label>
                <p className="text-xs text-muted-foreground">Repair items when durability is low.</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between">
                <Label className="text-xs">Stamina Reserve</Label>
                <span className="text-xs text-accent">5 Points</span>
              </div>
              <Slider defaultValue={[5]} max={20} step={1} className="py-2" />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
