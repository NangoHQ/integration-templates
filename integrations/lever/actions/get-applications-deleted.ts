import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    deleted_at_start: z.number().describe('Inclusive lower bound timestamp in milliseconds. Example: 1711929600000'),
    deleted_at_end: z.number().describe('Exclusive upper bound timestamp in milliseconds. Example: 1714521600000'),
    limit: z.number().optional().describe('Number of results per page (1-100). Defaults to 50.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderDeletedApplicationSchema = z.object({
    id: z.string(),
    deletedAt: z.number(),
    opportunityId: z.string().nullable().optional(),
    postingId: z.string().nullable().optional()
});

const ProviderListResponseSchema = z.object({
    data: z.array(ProviderDeletedApplicationSchema),
    hasNext: z.boolean(),
    next: z.string().optional()
});

const DeletedApplicationSchema = z.object({
    id: z.string(),
    deletedAt: z.number(),
    opportunityId: z.string().nullable().optional(),
    postingId: z.string().nullable().optional()
});

const OutputSchema = z.object({
    items: z.array(DeletedApplicationSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List deleted applications across the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['applications:read:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            deleted_at_start: input.deleted_at_start,
            deleted_at_end: input.deleted_at_end
        };

        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }

        if (input.cursor !== undefined) {
            params['offset'] = input.cursor;
        }

        // https://hire.lever.co/developer/documentation#list-deleted-applications
        const response = await nango.get({
            endpoint: '/v1/applications/deleted',
            params: params,
            retries: 3
        });

        const parsed = ProviderListResponseSchema.parse(response.data);

        return {
            items: parsed.data.map((item) => ({
                id: item.id,
                deletedAt: item.deletedAt,
                ...(item.opportunityId !== undefined && { opportunityId: item.opportunityId }),
                ...(item.postingId !== undefined && { postingId: item.postingId })
            })),
            ...(parsed.next !== undefined && { next_cursor: parsed.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
