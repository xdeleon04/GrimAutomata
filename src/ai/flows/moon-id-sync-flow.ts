
'use server';
/**
 * @fileOverview A flow to simulate fetching data from Moon ID.
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
      prompt: `You are a bot engine for MonstersGame. 
      Simulate a status check and recent activities for the user "${input.username}" on server "${input.server}".
      Generate a realistic set of 3-5 activity logs and current character stats.
      The tone should be gothic and dark.`,
      output: { schema: MoonIdSyncOutputSchema },
    });

    if (!output) throw new Error('Failed to generate sync data');
    return output;
  }
);
