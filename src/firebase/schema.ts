/**
 * Firestore schema types for GrimAutomata.
 * These mirror the document shapes stored under /users/{userId}/...
 */

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  creationDate: string;
  race?: "Vampire" | "Werewolf";
  level?: number;
  gold?: number;
  stamina?: number;
  maxStamina?: number;
  experience?: number;
  nextLevelExp?: number;
  skillAverage?: number;
  attributes?: {
    strength: number;
    defense: number;
    dexterity: number;
    agility: number;
    constitution: number;
  };
  lastSync?: any; // serverTimestamp
}

export interface MoonIdCredentials {
  id: string;
  userId: string;
  moonIdUsername: string;
  encryptedMoonIdPassword: string;
  description: string; // server hostname
}

export interface AutomationSetting {
  id: string;
  userId: string;
  settingName: string;
  settingValue: string; // JSON-encoded value
  description: string;
}

export interface ActivityLogEntry {
  id: string;
  userId: string;
  timestamp: string;
  logMessage: string;
  logLevel:
    | "INFO"
    | "BATTLE"
    | "TRAINING"
    | "LOOT"
    | "ERROR"
    | "MANHUNT"
    | "MISSION"
    | "DEBUG";
}
