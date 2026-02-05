
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
  logs: z.array(z.object({
    type: z.enum(['info', 'battle', 'training', 'loot', 'error']),
    message: z.string(),
  })),
  stats: z.object({
    level: z.number(),
    gold: z.number(),
    stamina: z.number(),
    power: z.number(),
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
      prompt: `You are the GrimAutomata engine core. 
      Simulate an automated status check and progression sync for the user "${input.username}" on the MonstersGame server "${input.server}".
      The user is currently connected via MoonID connect (API 83).
      
      Generate a realistic set of 3-5 activity logs reflecting actions like hunting, training, or managing equipment.
      Generate current character stats (Level 40-60, Gold 500k-2M, Stamina 0-100, Power 5000-15000).
      
      Tone requirements:
      - Gothic, dark, and professional.
      - Use terms like "Sanctuary", "Blood Gold", "Manhunt", "Grotto".
      - Refer to the server "${input.server}" as the "Active Realm".`,
      output: { schema: MoonIdSyncOutputSchema },
    });

    if (!output) throw new Error('The void failed to return data.');
    return output;
  }
);
