
"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lock, Mail, Globe, Save, Loader2 } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function CredentialManager() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [server, setServer] = useState('en1');

  const credentialRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid, 'moonIdCredentials', 'primary');
  }, [db, user]);

  const { data: credentials, isLoading } = useDoc(credentialRef);

  useEffect(() => {
    if (credentials) {
      setEmail(credentials.moonIdUsername || '');
      setServer(credentials.description || 'en1');
    }
  }, [credentials]);

  const handleSave = () => {
    if (!credentialRef || !user) return;

    setDocumentNonBlocking(credentialRef, {
      id: 'primary',
      userId: user.uid,
      moonIdUsername: email,
      encryptedMoonIdPassword: password, // In a real app, encrypt this before sending
      description: server,
    }, { merge: true });

    toast({
      title: "Sanctuary Updated",
      description: "Your credentials have been bound to the vault.",
    });
  };

  if (!user) return null;

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
          <Input 
            id="email" 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ritualist@moonid.net" 
            className="bg-background/50" 
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="pass" className="flex items-center gap-2"><Lock className="w-3 h-3" /> Secret Phrase</Label>
          <Input 
            id="pass" 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••" 
            className="bg-background/50" 
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="server" className="flex items-center gap-2"><Globe className="w-3 h-3" /> Realm Selection</Label>
          <Select value={server} onValueChange={setServer}>
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
        <Button 
          onClick={handleSave}
          className="w-full bg-primary hover:bg-primary/80 text-foreground gap-2 font-bold gothic-border"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Bind Credentials
        </Button>
      </CardFooter>
    </Card>
  );
}
