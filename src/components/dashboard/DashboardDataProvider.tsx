"use client";

import { createContext, use } from "react";
import { collection, doc, limit, orderBy, query } from "firebase/firestore";

import {
  useCollection,
  useDoc,
  useFirestore,
  useMemoFirebase,
  useUser,
} from "@/firebase";
import type { UseDocResult } from "@/firebase/firestore/use-doc";
import type { UseCollectionResult } from "@/firebase/firestore/use-collection";
import type {
  ActivityLogEntry,
  AutomationSetting,
  MoonIdCredentials,
  UserProfile,
} from "@/firebase/schema";

type UserProfileDocResult = UseDocResult<UserProfile>;
type CredentialsDocResult = UseDocResult<MoonIdCredentials>;
type AutomationSettingsCollectionResult =
  UseCollectionResult<AutomationSetting>;
type ActivityLogsCollectionResult = UseCollectionResult<ActivityLogEntry>;

type DashboardContextValue<T> = T | null;

const UserProfileContext =
  createContext<DashboardContextValue<UserProfileDocResult>>(null);
const CredentialsContext =
  createContext<DashboardContextValue<CredentialsDocResult>>(null);
const AutomationSettingsContext =
  createContext<DashboardContextValue<AutomationSettingsCollectionResult>>(
    null,
  );
const ActivityLogsContext =
  createContext<DashboardContextValue<ActivityLogsCollectionResult>>(null);

export function useUserProfile() {
  const context = use(UserProfileContext);
  if (!context) {
    throw new Error(
      "useUserProfile must be used within DashboardDataProvider.",
    );
  }
  return context;
}

export function useCredentials() {
  const context = use(CredentialsContext);
  if (!context) {
    throw new Error(
      "useCredentials must be used within DashboardDataProvider.",
    );
  }
  return context;
}

export function useAutomationSettings() {
  const context = use(AutomationSettingsContext);
  if (!context) {
    throw new Error(
      "useAutomationSettings must be used within DashboardDataProvider.",
    );
  }
  return context;
}

export function useActivityLogs() {
  const context = use(ActivityLogsContext);
  if (!context) {
    throw new Error(
      "useActivityLogs must be used within DashboardDataProvider.",
    );
  }
  return context;
}

type DashboardDataProviderProps = {
  children: React.ReactNode;
};

export function DashboardDataProvider({
  children,
}: DashboardDataProviderProps) {
  const { user } = useUser();
  const db = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const credentialsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "users", user.uid, "moonIdCredentials", "primary");
  }, [db, user?.uid]);

  const automationSettingsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "users", user.uid, "automationSettings");
  }, [db, user?.uid]);

  const activityLogsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    const base = collection(db, "users", user.uid, "activityLogs");
    return query(base, orderBy("timestamp", "desc"), limit(100));
  }, [db, user?.uid]);

  const userProfile: UserProfileDocResult = useDoc(userProfileRef);
  const credentials: CredentialsDocResult = useDoc(credentialsRef);
  const automationSettings: AutomationSettingsCollectionResult = useCollection(
    automationSettingsRef,
  );
  const activityLogs: ActivityLogsCollectionResult =
    useCollection(activityLogsQuery);

  return (
    <UserProfileContext value={userProfile}>
      <CredentialsContext value={credentials}>
        <AutomationSettingsContext value={automationSettings}>
          <ActivityLogsContext value={activityLogs}>
            {children}
          </ActivityLogsContext>
        </AutomationSettingsContext>
      </CredentialsContext>
    </UserProfileContext>
  );
}
