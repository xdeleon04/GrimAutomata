"use client";

import React, { useState, useEffect } from "react";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { ConfigPanel } from "@/components/dashboard/ConfigPanel";
import { ActivityLog } from "@/components/dashboard/ActivityLog";
import { CredentialManager } from "@/components/dashboard/CredentialManager";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  Ghost,
  Settings,
  History,
  Lock,
  User as UserIcon,
  Moon,
  LogIn,
  LayoutDashboard,
  ExternalLink,
} from "lucide-react";
import {
  useUser,
  useAuth,
  useFirestore,
  initiateAnonymousSignIn,
  setDocumentNonBlocking,
} from "@/firebase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { doc } from "firebase/firestore";

type View = "dashboard" | "profile" | "rituals" | "chronicles" | "vault";

export default function Home() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const [activeView, setActiveView] = useState<View>("dashboard");

  // Initialize the user profile document in Firestore once the user is authenticated
  useEffect(() => {
    if (user && db) {
      const userRef = doc(db, "users", user.uid);
      setDocumentNonBlocking(
        userRef,
        {
          id: user.uid,
          username: user.displayName || "Shadow Ritualist",
          email: user.email || `anonymous-${user.uid}@grimautomata.void`,
          creationDate: new Date().toISOString(),
        },
        { merge: true },
      );
    }
  }, [user, db]);

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-accent animate-pulse font-headline text-2xl tracking-widest text-center">
          INVOKING THE VOID...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background space-y-8 p-4">
        <div className="flex flex-col items-center gap-4 text-accent font-headline font-bold text-6xl">
          <Ghost className="w-24 h-24 drop-shadow-[0_0_15px_hsl(var(--accent))]" />
          <span className="tracking-[0.3em]">GRIM</span>
        </div>
        <div className="text-center space-y-2">
          <p className="text-muted-foreground max-w-md italic">
            &ldquo;The shadows await your command. Step into the sanctuary to
            begin the automation of your dark path.&rdquo;
          </p>
          <p className="text-[10px] text-accent/50 uppercase tracking-widest font-mono">
            Secure Connection: monstersgame.moonid.net
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => initiateAnonymousSignIn(auth)}
          className="bg-accent text-accent-foreground hover:bg-accent/90 px-12 font-bold gothic-border"
        >
          <LogIn className="w-5 h-5 mr-2" /> Enter the Sanctuary
        </Button>
      </div>
    );
  }

  const renderView = () => {
    switch (activeView) {
      case "dashboard":
        return <Dashboard />;
      case "profile":
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h1 className="text-3xl font-headline text-accent">
              Shadow Profile
            </h1>
            <Card className="gothic-border bg-card/50">
              <CardHeader>
                <CardTitle>User Identity</CardTitle>
                <CardDescription>
                  Your metadata within the GrimAutomata collective.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded bg-background/50">
                    <div className="text-xs text-muted-foreground uppercase">
                      UID
                    </div>
                    <div className="font-mono text-sm">{user.uid}</div>
                  </div>
                  <div className="p-4 border rounded bg-background/50">
                    <div className="text-xs text-muted-foreground uppercase">
                      Status
                    </div>
                    <div className="text-accent font-bold">
                      ASCENDED RITUALIST
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case "rituals":
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h1 className="text-3xl font-headline text-accent">Ritual Core</h1>
            <ConfigPanel />
          </div>
        );
      case "chronicles":
        return (
          <div className="space-y-6 h-[calc(100vh-180px)] animate-in fade-in slide-in-from-bottom-4">
            <h1 className="text-3xl font-headline text-accent">Chronicles</h1>
            <ActivityLog />
          </div>
        );
      case "vault":
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h1 className="text-3xl font-headline text-accent">
              Vault Storage
            </h1>
            <CredentialManager />
          </div>
        );
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background overflow-hidden selection:bg-accent/30 selection:text-accent">
        <Sidebar className="border-r border-primary/10">
          <SidebarHeader className="p-6">
            <div className="flex items-center gap-3 text-accent font-headline font-bold text-xl">
              <Ghost className="w-8 h-8 drop-shadow-[0_0_8px_hsl(var(--accent))]" />
              <span className="tracking-widest">GRIM</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu className="px-2">
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveView("dashboard")}
                  isActive={activeView === "dashboard"}
                  className="py-6"
                >
                  <LayoutDashboard className="w-5 h-5 mr-2" />{" "}
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveView("profile")}
                  isActive={activeView === "profile"}
                  className="py-6"
                >
                  <UserIcon className="w-5 h-5 mr-2" />{" "}
                  <span>Shadow Profile</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveView("rituals")}
                  isActive={activeView === "rituals"}
                  className="py-6"
                >
                  <Settings className="w-5 h-5 mr-2" /> <span>Ritual Core</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveView("chronicles")}
                  isActive={activeView === "chronicles"}
                  className="py-6"
                >
                  <History className="w-5 h-5 mr-2" /> <span>Chronicles</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveView("vault")}
                  isActive={activeView === "vault"}
                  className="py-6"
                >
                  <Lock className="w-5 h-5 mr-2" /> <span>Vault Storage</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <div className="p-4 mt-auto border-t border-primary/10 space-y-4">
            <div className="space-y-2">
              <a
                href="https://moonid.net/account/login/?next=/api/account/connect/83/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-accent hover:text-accent/80 transition-colors"
              >
                <ExternalLink className="w-3 h-3" /> Connect MoonID
              </a>
              <a
                href="https://es1.monstersgame.moonid.net/index.php"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-accent hover:text-accent/80 transition-colors"
              >
                <ExternalLink className="w-3 h-3" /> Play ES1
              </a>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground italic">
              <Moon className="w-3 h-3" /> Since Age 1,842
            </div>
          </div>
        </Sidebar>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6">
          {renderView()}
          <footer className="text-center py-4 text-[10px] text-muted-foreground/40 font-mono tracking-tighter uppercase">
            GRIMAUTOMATA v4.2.0-DARKEST_BLOOD // SERVER_ES1_BOUND //
            SECURE_PROTO_V3 // NO_CHANCE_FOR_HUMANS
          </footer>
        </main>
      </div>
    </SidebarProvider>
  );
}
