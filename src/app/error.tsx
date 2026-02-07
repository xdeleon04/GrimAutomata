"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GrimAutomata Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-destructive/50 bg-card/80 p-8 text-center shadow-lg">
        <div className="flex justify-center">
          <AlertTriangle className="h-12 w-12 text-destructive" />
        </div>
        <h2 className="font-headline text-xl text-destructive">
          A Dark Ritual Has Failed
        </h2>
        <p className="text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred in the shadows."}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60">
            Digest: {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} variant="outline" className="gap-2">
            <RotateCcw className="h-4 w-4" /> Try Again
          </Button>
          <Button asChild variant="ghost" className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" /> Go Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
