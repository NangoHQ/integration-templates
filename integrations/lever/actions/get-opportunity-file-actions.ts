import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    opportunityId: z.string().describe('Opportunity ID. Example: "6408dc54-7015-4e5b-8d60-23afff2b1efc"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of file actions to return per page (1-100).'),
    occurredAtStart: z.number().optional().describe('Inclusive lower bound on occurredAt timestamp in milliseconds.'),
    occurredAtEnd: z.number().optional().describe('Exclusive upper bound on occurredAt timestamp in milliseconds.')
});

const ProviderFileActionSchema = z.object({
    id: z.string(),
    opportunityId: z.string(),
    type: z.enum(['file-added', 'resume-imported', 'file-remove']),
    occurredAt: z.number(),
    createdAt: z.number(),
    user: z.object({
        id: z.string()
    }),
    meta: z.record(z.string(), z.unknown()).optional()
});

const ProviderListResponseSchema = z.object({
    data: z.array(ProviderFileActionSchema),
    hasNext: z.boolean().optional(),
    next: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ProviderFileActionSchema),
    next: z.string().optional()
});

const action = createAction({
    description: 'List file-related actions (uploads/downloads) recorded against an opportunity.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['opportunities:read:admin', 'files:read:admin'],

    exec: async (nango, input) => {
        const response = await nango.get({
            // https://hire.lever.co/developer/documentation
            endpoint: `/v1/opportunities/${encodeURIComponent(input.opportunityId)}/file_actions`,
            params: {
                ...(input.cursor && { offset: input.cursor }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.occurredAtStart !== undefined && { occurred_at_start: input.occurredAtStart }),
                ...(input.occurredAtEnd !== undefined && { occurred_at_end: input.occurredAtEnd })
            },
            retries: 3
        });

        const providerResponse = ProviderListResponseSchema.parse(response.data);

        return {
            items: providerResponse.data,
            ...(providerResponse.next != null && { next: providerResponse.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
