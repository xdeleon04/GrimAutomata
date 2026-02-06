"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Swords, BookOpen, Ghost, MapPin, Loader2, Target, Search, Zap, Hammer, FlaskConical } from 'lucide-react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, doc } from 'firebase/firestore';

export function ConfigPanel() {
  const { user } = useUser();
  const db = useFirestore();

  const settingsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'automationSettings');
  }, [db, user]);

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: settings, isLoading: isSettingsLoading } = useCollection(settingsQuery);
  const { data: userData, isLoading: isUserDocLoading } = useDoc(userDocRef);

  const isLoading = isSettingsLoading || isUserDocLoading;

  const getSetting = (name: string, defaultValue: any) => {
    const setting = settings?.find(s => s.settingName === name);
    if (!setting) return defaultValue;
    try {
      const val = JSON.parse(setting.settingValue);
      if (val === "" && typeof defaultValue === 'string' && defaultValue !== "") {
        return defaultValue;
      }
      return val;
    } catch {
      return setting.settingValue || defaultValue;
    }
  };

  const updateSetting = (name: string, value: any) => {
    if (!db || !user) return;
    const settingId = name.toLowerCase().replace(/\s+/g, '_');
    const settingRef = doc(db, 'users', user.uid, 'automationSettings', settingId);
    
    setDocumentNonBlocking(settingRef, {
      id: settingId,
      userId: user.uid,
      settingName: name,
      settingValue: JSON.stringify(value),
      description: `Automated setting for ${name}`
    }, { merge: true });
  };

  if (isLoading) {
    return (
      <Card className="h-full gothic-border bg-card/50">
        <CardContent className="h-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </CardContent>
      </Card>
    );
  }

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
          <TabsList className="grid w-full grid-cols-5 bg-muted/30">
            <TabsTrigger value="combat" className="data-[state=active]:bg-primary"><Swords className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="alchemy" className="data-[state=active]:bg-primary"><FlaskConical className="w-4 h-4" /></TabsTrigger>
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
                <Switch 
                  checked={getSetting('auto_manhunt', true)} 
                  onCheckedChange={(checked) => updateSetting('auto_manhunt', checked)}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">Hunt Duration (Minutes)</Label>
                <Select 
                  value={getSetting('manhunt_duration', '60')} 
                  onValueChange={(value) => updateSetting('manhunt_duration', value)}
                >
                  <SelectTrigger className="h-8 bg-background/50">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 Minutes</SelectItem>
                    <SelectItem value="20">20 Minutes</SelectItem>
                    <SelectItem value="30">30 Minutes</SelectItem>
                    <SelectItem value="40">40 Minutes</SelectItem>
                    <SelectItem value="50">50 Minutes</SelectItem>
                    <SelectItem value="60">60 Minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <div className="space-y-0.5">
                  <Label>PVP: Attack Opponents</Label>
                  <p className="text-xs text-muted-foreground">Automatically attack members of the opposite race.</p>
                </div>
                <Switch 
                  checked={getSetting('pvp_attack', false)} 
                  onCheckedChange={(checked) => updateSetting('pvp_attack', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-2">
                  <Search className="w-3 h-3" /> Search Strategy
                </Label>
                <Select 
                  value={getSetting('pvp_search_strategy', 'none')} 
                  onValueChange={(value) => updateSetting('pvp_search_strategy', value)}
                >
                  <SelectTrigger className="h-8 bg-background/50">
                    <SelectValue placeholder="Select strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Normal Search</SelectItem>
                    <SelectItem value="17">Stronger Rivals</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="alchemy" className="space-y-6 pt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Alchemy</Label>
                  <p className="text-xs text-muted-foreground">Buy and use elixirs when vitality is low.</p>
                </div>
                <Switch 
                  checked={getSetting('auto_alchemy', false)} 
                  onCheckedChange={(checked) => updateSetting('auto_alchemy', checked)}
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <Label className="text-xs">Vitality Use Threshold</Label>
                  <span className="text-xs text-accent">{getSetting('alchemy_threshold', 30)}%</span>
                </div>
                <Slider 
                  value={[getSetting('alchemy_threshold', 30)]} 
                  max={90} 
                  step={1} 
                  className="py-2" 
                  onValueChange={(value) => updateSetting('alchemy_threshold', value[0])}
                />
                <p className="text-[10px] text-muted-foreground italic">Bot will attempt alchemy if energy falls below this point.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Max Potion Budget</Label>
                <Select 
                  value={getSetting('potion_budget', '445')} 
                  onValueChange={(value) => updateSetting('potion_budget', value)}
                >
                  <SelectTrigger className="h-8 bg-background/50">
                    <SelectValue placeholder="Select max price" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="49">49 Gold (Smallest Restore)</SelectItem>
                    <SelectItem value="89">89 Gold (Small Restore)</SelectItem>
                    <SelectItem value="445">445 Gold (Medium Restore)</SelectItem>
                    <SelectItem value="891">891 Gold (Large Restore)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="growth" className="space-y-6 pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Training</Label>
                <p className="text-xs text-muted-foreground">Spend gold on character attributes.</p>
              </div>
              <Switch 
                checked={getSetting('auto_training', true)} 
                onCheckedChange={(checked) => updateSetting('auto_training', checked)}
              />
            </div>
            
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Attribute Priority</Label>
              <div className="grid grid-cols-1 gap-2">
                {['Strength', 'Defense', 'Dexterity', 'Agility', 'Constitution'].map(stat => (
                  <div key={stat} className="flex items-center justify-between p-2 border rounded-md text-xs bg-muted/20">
                    <span>{stat}</span>
                    <Switch 
                      size="sm" 
                      checked={getSetting(`train_${stat.toLowerCase()}`, true)}
                      onCheckedChange={(checked) => updateSetting(`train_${stat.toLowerCase()}`, checked)}
                    />
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
              <Switch 
                checked={getSetting('auto_grotto', true)} 
                onCheckedChange={(checked) => updateSetting('auto_grotto', checked)}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs">Mission Difficulty</Label>
              <Select 
                value={getSetting('mission_difficulty', 'medium')} 
                onValueChange={(value) => updateSetting('mission_difficulty', value)}
              >
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
          </TabsContent>

          <TabsContent value="behavior" className="space-y-6 pt-4">
            <div className="space-y-4">
              <div className="flex justify-between">
                <Label className="text-xs flex items-center gap-2">
                  <Zap className="w-3 h-3" /> Stamina Ritual Threshold
                </Label>
                <span className="text-xs text-accent">{getSetting('stamina_reserve', 10)}%</span>
              </div>
              <Slider 
                value={[getSetting('stamina_reserve', 10)]} 
                max={100} 
                step={1} 
                className="py-2" 
                onValueChange={(value) => updateSetting('stamina_reserve', value[0])}
              />
              <p className="text-[10px] text-muted-foreground italic">Rituals will pause if stamina falls below this percentage.</p>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2"><Hammer className="w-3 h-3" /> Auto-Work at Graveyard</Label>
                <p className="text-xs text-muted-foreground">Automatically work to restore stamina when below threshold.</p>
              </div>
              <Switch 
                checked={getSetting('auto_work', true)} 
                onCheckedChange={(checked) => updateSetting('auto_work', checked)}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
