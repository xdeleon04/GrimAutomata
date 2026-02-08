"use server";
/**
 * @fileOverview A flow to fetch real data and execute automations in MonstersGame.
 *
 * - syncMoonId - Orchestrates the retrieval of character stats and execution of rituals.
 */

import { ai } from "@/ai/genkit";
import { z } from "genkit";
import { fetchMonstersGameData, fetchCooldownOnly } from "@/services/monsters-game";
import { decrypt } from "@/services/crypto";

const MoonIdSyncInputSchema = z.object({
  username: z.string(),
  password: z.string().optional(),
  server: z.string(),
  debug: z.boolean().optional(),
  settings: z.record(z.any()).optional(),
  pvpTargetList: z
    .array(
      z.object({
        rivalGameId: z.string(),
        rivalName: z.string(),
      }),
    )
    .optional()
    .default([]),
});
export type MoonIdSyncInput = z.infer<typeof MoonIdSyncInputSchema>;

const MoonIdSyncOutputSchema = z.object({
  race: z.enum(["Vampire", "Werewolf"]),
  pvpCooldown: z.number().default(0),
  cooldownReason: z.string().optional(),
  logs: z.array(
    z.object({
      type: z.enum([
        "INFO",
        "BATTLE",
        "TRAINING",
        "LOOT",
        "ERROR",
        "MANHUNT",
        "MISSION",
        "DEBUG",
      ]),
      message: z.string(),
      timestamp: z.string(),
    }),
  ),
  pvpResults: z
    .array(
      z.object({
        rivalName: z.string(),
        rivalGameId: z.string(),
        rivalRace: z.string().optional(),
        isWinner: z.boolean(),
        goldLooted: z.number(),
        xpEarned: z.number(),
        timestamp: z.string(),
      }),
    )
    .default([]),
  manualPvpStatus: z
    .object({
      currentTargetId: z.string(),
      currentTargetName: z.string(),
      targetIndex: z.number(),
      totalTargets: z.number(),
      attempted: z.array(z.string()),
    })
    .optional(),
  stats: z.object({
    level: z.number(),
    gold: z.number(),
    blood: z.number(),
    stamina: z.number(),
    maxStamina: z.number(),
    experience: z.number(),
    nextLevelExp: z.number(),
    skillAverage: z.number(),
    attributes: z.object({
      strength: z.number(),
      defense: z.number(),
      dexterity: z.number(),
      agility: z.number(),
      constitution: z.number(),
    }),
  }),
});
export type MoonIdSyncOutput = z.infer<typeof MoonIdSyncOutputSchema>;

export async function syncMoonId(
  input: MoonIdSyncInput,
): Promise<MoonIdSyncOutput> {
  return moonIdSyncFlow(input);
}

/**
 * Lightweight heartbeat: fetches only the cooldown timer from the game server.
 */
export async function checkCooldown(input: {
  username: string;
  password?: string;
  server: string;
}): Promise<{ pvpCooldown: number }> {
  const decryptedPassword = input.password
    ? await decrypt(input.password)
    : "";
  return fetchCooldownOnly(input.username, decryptedPassword, input.server);
}

const moonIdSyncFlow = ai.defineFlow(
  {
    name: "moonIdSyncFlow",
    inputSchema: MoonIdSyncInputSchema,
    outputSchema: MoonIdSyncOutputSchema,
  },
  async (input) => {
    const decryptedPassword = input.password
      ? await decrypt(input.password)
      : "";
    const gameData = await fetchMonstersGameData(
      input.username,
      decryptedPassword,
      input.server,
      input.debug,
      input.settings || {},
      input.pvpTargetList || [],
    );

    if (!gameData) {
      throw new Error(
        "Ritual Failed: The realm remained closed. Check your MoonID credentials.",
      );
    }

    return gameData;
  },
);
