"use client";

import React from "react";
import dynamic from "next/dynamic";
import { StatusHeader } from "@/components/dashboard/StatusHeader";
import { QuickStats } from "@/components/dashboard/QuickStats";

const ConfigPanel = dynamic(
  () => import("@/components/dashboard/ConfigPanel").then((m) => m.ConfigPanel),
  {
    loading: () => (
      <div className="h-64 flex items-center justify-center">
        <span className="animate-pulse">Loading...</span>
      </div>
    ),
  },
);

const ActivityLog = dynamic(
  () => import("@/components/dashboard/ActivityLog").then((m) => m.ActivityLog),
  {
    loading: () => (
      <div className="h-64 flex items-center justify-center">
        <span className="animate-pulse">Loading...</span>
      </div>
    ),
  },
);

const CredentialManager = dynamic(
  () =>
    import("@/components/dashboard/CredentialManager").then(
      (m) => m.CredentialManager,
    ),
  {
    loading: () => (
      <div className="h-32 flex items-center justify-center">
        <span className="animate-pulse">Loading...</span>
      </div>
    ),
  },
);

export function Dashboard() {
  return (
    <>
      <StatusHeader />
      <QuickStats />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-1 space-y-6 flex flex-col">
          <ConfigPanel />
          <CredentialManager />
        </div>
        <div className="xl:col-span-2 h-full">
          <ActivityLog />
        </div>
      </div>
    </>
  );
}
