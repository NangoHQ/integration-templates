import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({}).describe('This action takes no input.');

const OutputSchema = z
    .object({
        credits: z.number().describe('Total enrichment credits remaining on the team account.'),
        details: z
            .object({
                remaining: z
                    .object({
                        total: z.number().describe('Total credits remaining across all sources.'),
                        freemium: z.number().describe('Remaining credits from the free allowance.'),
                        subscription: z.number().describe('Remaining credits included with the team subscription.'),
                        gifted: z.number().describe('Remaining credits that were gifted by lemlist.'),
                        paid: z.number().describe('Remaining credits that were purchased separately.')
                    })
                    .describe('Breakdown of the remaining credit balance by source.')
            })
            .describe('Detailed credit balance information.')
    })
    .describe("The team's remaining enrichment/email-finding credit balance.");

/**
 * @tags: [read]
 * @tagReason: Performs a single GET request to read the team's credit balance without modifying any provider state.
 */
const action = createAction({
    description: "Get the team's remaining enrichment/email-finding credit balance.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.lemlist.com/api-reference/endpoints/team/get-team-credits
            endpoint: '/api/team/credits',
            retries: 3
        };

        const response = await nango.get(config);

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
