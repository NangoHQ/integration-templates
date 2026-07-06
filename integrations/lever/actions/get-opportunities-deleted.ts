import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (offset token) from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of results to return per page (1–100). Defaults to 100.'),
    deleted_at_start: z.number().int().optional().describe('Inclusive lower bound on deletion timestamp (ms).'),
    deleted_at_end: z.number().int().optional().describe('Inclusive upper bound on deletion timestamp (ms).')
});

const ProviderDeletedOpportunitySchema = z
    .object({
        id: z.string()
    })
    .passthrough();

const ProviderListResponseSchema = z.object({
    data: z.array(ProviderDeletedOpportunitySchema),
    hasNext: z.boolean(),
    next: z.string().optional().nullable()
});

const OutputSchema = z.object({
    opportunities: z.array(z.object({ id: z.string() }).passthrough()),
    next: z.string().optional().describe('Pagination cursor for the next page. Omit when there are no more results.')
});

const action = createAction({
    description: 'List opportunities deleted from your Lever account, for deletion-detection use cases.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['opportunities:read:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://hire.lever.co/developer/documentation#list-deleted-opportunities
        const response = await nango.get({
            endpoint: '/v1/opportunities/deleted',
            params: {
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.cursor && { offset: input.cursor }),
                ...(input.deleted_at_start !== undefined && { deleted_at_start: String(input.deleted_at_start) }),
                ...(input.deleted_at_end !== undefined && { deleted_at_end: String(input.deleted_at_end) })
            },
            retries: 3
        });

        const raw = ProviderListResponseSchema.parse(response.data);

        return {
            opportunities: raw.data,
            ...(raw.next != null && typeof raw.next === 'string' ? { next: raw.next } : {})
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
