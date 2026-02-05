'use server';
/**
 * @fileOverview A flow to fetch real data from MonstersGame.
 * 
 * - syncMoonId - Orchestrates the retrieval of character stats and logs from the game server.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { fetchMonstersGameData } from '@/services/monsters-game';

const MoonIdSyncInputSchema = z.object({
  username: z.string(),
  password: z.string().optional(),
  server: z.string(),
});
export type MoonIdSyncInput = z.infer<typeof MoonIdSyncInputSchema>;

const MoonIdSyncOutputSchema = z.object({
  race: z.enum(['Vampire', 'Werewolf']),
  logs: z.array(z.object({
    type: z.enum(['INFO', 'BATTLE', 'TRAINING', 'LOOT', 'ERROR', 'MANHUNT', 'MISSION']),
    message: z.string(),
    timestamp: z.string(),
  })),
  stats: z.object({
    level: z.number(),
    gold: z.number(),
    stamina: z.number(),
    experience: z.number(),
    nextLevelExp: z.number(),
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

export async function syncMoonId(input: MoonIdSyncInput): Promise<MoonIdSyncOutput> {
  return moonIdSyncFlow(input);
}

const moonIdSyncFlow = ai.defineFlow(
  {
    name: 'moonIdSyncFlow',
    inputSchema: MoonIdSyncInputSchema,
    outputSchema: MoonIdSyncOutputSchema,
  },
  async (input) => {
    // We now bypass ai.generate and use the real game service
    // This ensures data is "not made up with AI" as requested
    const gameData = await fetchMonstersGameData(input.username, input.password || '', input.server);
    
    if (!gameData) {
      throw new Error('Failed to penetrate the game realm. Check your credentials in the Vault.');
    }

    return gameData;
  }
);
