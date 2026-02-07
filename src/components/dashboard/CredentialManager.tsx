"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lock, Mail, Globe, Save, Loader2, ExternalLink } from "lucide-react";
import {
  useUser,
  useFirestore,
  useMemoFirebase,
  setDocumentNonBlocking,
} from "@/firebase";
import { encryptPassword } from "@/services/credentials";
import { doc } from "firebase/firestore";
import { useCredentials } from "@/components/dashboard/DashboardDataProvider";
import { useToast } from "@/hooks/use-toast";

export function CredentialManager() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [server, setServer] = useState("es1.monstersgame.moonid.net");
  const [isSaving, setIsSaving] = useState(false);

  const credentialRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "users", user.uid, "moonIdCredentials", "primary");
  }, [db, user]);

  const { data: credentials } = useCredentials();

  useEffect(() => {
    if (credentials) {
      setEmail(credentials.moonIdUsername || "");
      setServer(credentials.description || "es1.monstersgame.moonid.net");
    }
  }, [credentials]);

  const handleSave = async () => {
    if (!credentialRef || !user) return;

    if (!email || !email.includes("@")) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid MoonID email address.",
        variant: "destructive",
      });
      return;
    }

    if (!credentials?.encryptedMoonIdPassword && !password) {
      toast({
        title: "Password Required",
        description: "Please enter your MoonID password.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload: Record<string, string> = {
        id: "primary",
        userId: user.uid,
        moonIdUsername: email,
        description: server,
      };

      if (password) {
        payload.encryptedMoonIdPassword = await encryptPassword(password);
      }

      setDocumentNonBlocking(credentialRef, payload, { merge: true });
      setPassword("");
      toast({
        title: "Sanctuary Updated",
        description:
          "Your credentials have been encrypted and bound to the vault.",
      });
    } catch (err: unknown) {
      toast({
        title: "Ritual Failed",
        description:
          err instanceof Error ? err.message : "Could not encrypt credentials.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Card className="gothic-border bg-card/50">
      <CardHeader>
        <CardTitle className="text-accent flex items-center justify-between font-headline">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5" /> MoonID Sanctuary
          </div>
          <a
            href="https://moonid.net/account/login/?next=/api/account/connect/83/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-muted-foreground hover:text-accent flex items-center gap-1"
          >
            CONNECT API <ExternalLink className="w-2 h-2" />
          </a>
        </CardTitle>
        <CardDescription>
          Your credentials are encrypted within the GrimAutomata vault.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="w-3 h-3" /> MoonID Email
          </Label>
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
          <Label htmlFor="pass" className="flex items-center gap-2">
            <Lock className="w-3 h-3" /> Secret Phrase
          </Label>
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
          <Label htmlFor="server" className="flex items-center gap-2">
            <Globe className="w-3 h-3" /> Realm Selection
          </Label>
          <Select value={server} onValueChange={setServer}>
            <SelectTrigger className="bg-background/50">
              <SelectValue placeholder="Select Server" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="es1.monstersgame.moonid.net">
                MonstersGame ES1 (Primary)
              </SelectItem>
              <SelectItem value="en1.monstersgame.moonid.net">
                MonstersGame EN1 (The Abyss)
              </SelectItem>
              <SelectItem value="de1.monstersgame.moonid.net">
                MonstersGame DE1 (Das Grab)
              </SelectItem>
              <SelectItem value="us1.monstersgame.moonid.net">
                MonstersGame US1 (Deadlands)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-primary hover:bg-primary/80 text-foreground gap-2 font-bold gothic-border"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSaving ? "Encrypting..." : "Bind Credentials"}
        </Button>
      </CardFooter>
    </Card>
  );
}
