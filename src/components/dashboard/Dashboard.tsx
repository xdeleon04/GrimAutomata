
"use client"

import React from 'react';
import { StatusHeader } from '@/components/dashboard/StatusHeader';
import { ActivityLog } from '@/components/dashboard/ActivityLog';
import { ConfigPanel } from '@/components/dashboard/ConfigPanel';
import { CredentialManager } from '@/components/dashboard/CredentialManager';
import { QuickStats } from '@/components/dashboard/QuickStats';

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
