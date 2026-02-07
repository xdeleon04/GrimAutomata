"use client";

import { useUser } from "@/firebase";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default function ProfilePage() {
  const { user } = useUser();

  if (!user) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <h1 className="text-3xl font-headline text-accent">Shadow Profile</h1>
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
              <div className="text-xs text-muted-foreground uppercase">UID</div>
              <div className="font-mono text-sm">{user.uid}</div>
            </div>
            <div className="p-4 border rounded bg-background/50">
              <div className="text-xs text-muted-foreground uppercase">
                Status
              </div>
              <div className="text-accent font-bold">ASCENDED RITUALIST</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
