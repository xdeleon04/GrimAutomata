
"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lock, Mail, Globe, Save } from 'lucide-react';

export function CredentialManager() {
  return (
    <Card className="gothic-border bg-card/50">
      <CardHeader>
        <CardTitle className="text-accent flex items-center gap-2 font-headline">
          <Lock className="w-5 h-5" /> MoonID Sanctuary
        </CardTitle>
        <CardDescription>Your credentials are encrypted within the GrimAutomata vault.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2"><Mail className="w-3 h-3" /> MoonID Email</Label>
          <Input id="email" type="email" placeholder="ritualist@moonid.net" className="bg-background/50" />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="pass" className="flex items-center gap-2"><Lock className="w-3 h-3" /> Secret Phrase</Label>
          <Input id="pass" type="password" placeholder="••••••••••••" className="bg-background/50" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="server" className="flex items-center gap-2"><Globe className="w-3 h-3" /> Realm Selection</Label>
          <Select defaultValue="en1">
            <SelectTrigger className="bg-background/50">
              <SelectValue placeholder="Select Server" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en1">Server 1 (The Abyss)</SelectItem>
              <SelectItem value="en2">Server 2 (The Void)</SelectItem>
              <SelectItem value="de1">German Server 1 (Das Grab)</SelectItem>
              <SelectItem value="us1">US Server 1 (Deadlands)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full bg-primary hover:bg-primary/80 text-foreground gap-2 font-bold gothic-border">
          <Save className="w-4 h-4" /> Bind Credentials
        </Button>
      </CardFooter>
    </Card>
  );
}
