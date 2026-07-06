import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    opportunityId: z.string().describe('Opportunity ID. Example: "6408dc54-7015-4e5b-8d60-23afff2b1efc"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of results to return per page (1-100). Defaults to the API default.')
});

const ReferralSchema = z.object({
    id: z.string(),
    type: z.string(),
    text: z.string().optional(),
    instructions: z.string().optional(),
    fields: z.array(z.unknown()).optional(),
    baseTemplateId: z.string().optional(),
    user: z.string().optional(),
    referrer: z.string().optional(),
    stage: z.string().optional(),
    createdAt: z.number().optional(),
    completedAt: z.number().optional()
});

const OutputSchema = z.object({
    items: z.array(ReferralSchema),
    next: z.string().optional(),
    hasNext: z.boolean().optional()
});

const action = createAction({
    description: 'List referrals associated with an opportunity.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['referrals:read:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://hire.lever.co/developer/documentation
            endpoint: `/v1/opportunities/${encodeURIComponent(input.opportunityId)}/referrals`,
            params: {
                ...(input.cursor !== undefined && { offset: input.cursor }),
                ...(input.limit !== undefined && { limit: input.limit })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                data: z.array(ReferralSchema),
                next: z.string().optional(),
                hasNext: z.boolean().optional()
            })
            .parse(response.data);

        return {
            items: providerResponse.data,
            ...(providerResponse.next !== undefined && { next: providerResponse.next }),
            ...(providerResponse.hasNext !== undefined && { hasNext: providerResponse.hasNext })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
