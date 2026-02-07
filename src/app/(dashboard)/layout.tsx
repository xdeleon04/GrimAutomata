"use client";

import React, { useEffect } from "react";
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
  Crosshair,
} from "lucide-react";
import { useUser, useFirestore, setDocumentNonBlocking } from "@/firebase";
import { Button } from "@/components/ui/button";
import { doc } from "firebase/firestore";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { DashboardDataProvider } from "@/components/dashboard/DashboardDataProvider";
import { initiateAnonymousSignIn, useAuth } from "@/firebase";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const pathname = usePathname();

  // Initialize user profile doc on first auth (once per session)
  const hasInitialized = React.useRef(false);

  useEffect(() => {
    if (user && db && !hasInitialized.current) {
      hasInitialized.current = true;
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
          aria-label="Sign in anonymously to enter the dashboard"
          onClick={() => initiateAnonymousSignIn(auth)}
          className="bg-accent text-accent-foreground hover:bg-accent/90 px-12 font-bold gothic-border"
        >
          <LogIn className="w-5 h-5 mr-2" /> Enter the Sanctuary
        </Button>
      </div>
    );
  }

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/profile", label: "Shadow Profile", icon: UserIcon },
    { href: "/rituals", label: "Ritual Core", icon: Settings },
    { href: "/chronicles", label: "Chronicles", icon: History },
    { href: "/pvp", label: "Shadow Marks", icon: Crosshair },
    { href: "/vault", label: "Vault Storage", icon: Lock },
  ];

  return (
    <DashboardDataProvider>
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
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      className="py-6"
                    >
                      <Link href={item.href}>
                        <item.icon className="w-5 h-5 mr-2" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
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
            {children}
            <footer className="text-center py-4 text-[10px] text-muted-foreground/40 font-mono tracking-tighter uppercase">
              GRIMAUTOMATA v4.2.0-DARKEST_BLOOD // SERVER_ES1_BOUND //
              SECURE_PROTO_V3 // NO_CHANCE_FOR_HUMANS
            </footer>
          </main>
        </div>
      </SidebarProvider>
    </DashboardDataProvider>
  );
}
