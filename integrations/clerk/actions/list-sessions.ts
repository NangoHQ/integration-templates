import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor returned by a previous request. Omit for the first page.'),
    limit: z.number().int().min(1).max(500).optional(),
    client_id: z.string().optional(),
    user_id: z.string().optional(),
    status: z.enum(['abandoned', 'active', 'ended', 'expired', 'removed', 'replaced', 'revoked']).optional()
});
const ResourceSchema = z
    .object({
        id: z.string(),
        object: z.string().optional(),
        client_id: z.string().optional(),
        user_id: z.string(),
        status: z.enum(['abandoned', 'active', 'ended', 'expired', 'removed', 'replaced', 'revoked']).optional(),
        last_active_at: z.number().optional(),
        expire_at: z.number().optional(),
        abandon_at: z.number().optional(),
        created_at: z.number().optional(),
        updated_at: z.number().optional()
    })
    .passthrough();
const ProviderResponseSchema = z.object({ data: z.array(ResourceSchema), total_count: z.number() });
const OutputSchema = z.object({ items: z.array(ResourceSchema), next_cursor: z.string().optional(), total: z.number() });
const action = createAction({
    description: 'List Clerk sessions.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const offset = input.cursor === undefined ? 0 : Number.parseInt(input.cursor, 10);
        if (!Number.isInteger(offset) || offset < 0) throw new nango.ActionError({ type: 'invalid_cursor', message: 'Cursor must be a non-negative integer.' });
        const response = await nango.get({
            // https://clerk.com/docs/reference/backend-api/tag/Sessions#operation/GetSessionList
            endpoint: '/v1/sessions',
            params: {
                offset: String(offset),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.client_id !== undefined && { client_id: input.client_id }),
                ...(input.user_id !== undefined && { user_id: input.user_id }),
                ...(input.status !== undefined && { status: input.status })
            },
            retries: 3
        });
        const provider = ProviderResponseSchema.parse(response.data);
        const nextOffset = offset + provider.data.length;
        return { items: provider.data, ...(nextOffset < provider.total_count && { next_cursor: String(nextOffset) }), total: provider.total_count };
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
