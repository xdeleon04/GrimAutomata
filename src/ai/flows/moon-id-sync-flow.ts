
'use server';
/**
 * @fileOverview A flow to simulate fetching data from Moon ID and MonstersGame.
 * 
 * - syncMoonId - Syncs with the specified server using user credentials.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MoonIdSyncInputSchema = z.object({
  username: z.string(),
  server: z.string(),
});
export type MoonIdSyncInput = z.infer<typeof MoonIdSyncInputSchema>;

const MoonIdSyncOutputSchema = z.object({
  race: z.enum(['Vampire', 'Werewolf']),
  logs: z.array(z.object({
    type: z.enum(['info', 'battle', 'training', 'loot', 'error', 'manhunt']),
    message: z.string(),
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
    const { output } = await ai.generate({
      prompt: `You are the GrimAutomata engine core, a high-performance bot for MonstersGame. 
      Simulate a character synchronization for user "${input.username}" on server "${input.server}".
      
      MonstersGame is a browser MMORPG about Vampires vs. Werewolves.
      
      Generate a realistic character state:
      1. Pick a Race: Vampire or Werewolf.
      2. Generate 4-6 Activity Logs reflecting:
         - A "Manhunt" (hunting humans for gold).
         - An "Ancestral Grotto" mission (PvE quest).
         - A "Training" session (increasing a specific attribute).
         - A "Battle" against the opposite race.
      3. Generate stats:
         - Level: 30-70.
         - Gold: 100k - 5M.
         - Stamina: 0-100.
         - Attributes: Strength, Defense, Dexterity, Agility, Constitution (all 100-500).
      
      Tone: Gothic, dark, and technical. Use terms like "Bite", "Howl", "Shadow Realm", "Manhunt duration", "Slayer".
      Server context: "${input.server}" is the target realm.`,
      output: { schema: MoonIdSyncOutputSchema },
    });

    if (!output) throw new Error('The void failed to return data.');
    return output;
  }
);
