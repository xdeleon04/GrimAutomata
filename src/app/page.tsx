
"use client"

import { StatusHeader } from '@/components/dashboard/StatusHeader';
import { ActivityLog } from '@/components/dashboard/ActivityLog';
import { ConfigPanel } from '@/components/dashboard/ConfigPanel';
import { CredentialManager } from '@/components/dashboard/CredentialManager';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { Ghost, Settings, History, Lock, User as UserIcon, Info, Moon, LogIn } from 'lucide-react';
import { useUser, useAuth, initiateAnonymousSignIn } from '@/firebase';
import { Button } from '@/components/ui/button';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-accent animate-pulse font-headline text-2xl tracking-widest">AWAKENING...</div>
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
        <p className="text-muted-foreground text-center max-w-md italic">
          "The shadows await your command. Step into the sanctuary to begin the automation of your dark path."
        </p>
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

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background overflow-hidden selection:bg-accent/30 selection:text-accent">
        {/* Dark Sidebar */}
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
                <SidebarMenuButton className="text-accent hover:bg-primary/20 py-6">
                  <UserIcon className="w-5 h-5 mr-2" /> <span>Shadow Profile</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton className="py-6">
                  <Settings className="w-5 h-5 mr-2" /> <span>Ritual Core</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton className="py-6">
                  <History className="w-5 h-5 mr-2" /> <span>Chronicles</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton className="py-6">
                  <Lock className="w-5 h-5 mr-2" /> <span>Vault Storage</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <div className="p-4 mt-auto border-t border-primary/10 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground italic mb-4">
              <Moon className="w-3 h-3" /> Since Age 1,842
            </div>
            <SidebarMenuButton className="text-[10px] uppercase tracking-widest opacity-50 hover:opacity-100">
              <Info className="w-3 h-3 mr-1" /> Grimoire Docs
            </SidebarMenuButton>
          </div>
        </Sidebar>

        {/* Main Dashboard Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6">
          <StatusHeader />
          
          <QuickStats />

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-[calc(100vh-320px)] min-h-[600px]">
            {/* Left: Configuration & Credentials */}
            <div className="xl:col-span-1 space-y-6 flex flex-col">
              <div className="flex-1">
                <ConfigPanel />
              </div>
              <div className="shrink-0">
                <CredentialManager />
              </div>
            </div>

            {/* Right: Activity Log */}
            <div className="xl:col-span-2">
              <ActivityLog />
            </div>
          </div>
          
          <footer className="text-center py-4 text-xs text-muted-foreground/40 font-mono tracking-tighter">
            GRIMAUTOMATA v4.2.0-DARKEST_BLOOD // SECURE_PROTO_V3 // NO_CHANCE_FOR_HUMANS
          </footer>
        </main>
      </div>
    </SidebarProvider>
  );
}
