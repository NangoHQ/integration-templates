import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor returned by a previous request. Omit for the first page.'),
        limit: z.number().int().min(1).max(500).optional(),
        client_id: z.string().min(1).optional(),
        user_id: z.string().min(1).optional(),
        status: z.enum(['abandoned', 'active', 'ended', 'expired', 'removed', 'replaced', 'revoked']).optional()
    })
    .refine((value) => value.client_id !== undefined || value.user_id !== undefined, {
        message: 'Provide at least one of client_id or user_id.'
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
// GET /v1/sessions returns a plain JSON array without a total count.
const ProviderResponseSchema = z.array(ResourceSchema);
const OutputSchema = z.object({ items: z.array(ResourceSchema), next_cursor: z.string().optional() });
const action = createAction({
    description: 'List Clerk sessions.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const offset = input.cursor === undefined ? 0 : /^\d+$/.test(input.cursor) ? Number(input.cursor) : Number.NaN;
        if (!Number.isSafeInteger(offset) || offset < 0) throw new nango.ActionError({ type: 'invalid_cursor', message: 'Cursor must be a non-negative integer.' });
        const limit = input.limit ?? 10;
        const response = await nango.get({
            // https://clerk.com/docs/reference/backend-api/tag/Sessions#operation/GetSessionList
            endpoint: '/v1/sessions',
            params: {
                offset: String(offset),
                limit: String(limit),
                ...(input.client_id !== undefined && { client_id: input.client_id }),
                ...(input.user_id !== undefined && { user_id: input.user_id }),
                ...(input.status !== undefined && { status: input.status })
            },
            retries: 3
        });
        const sessions = ProviderResponseSchema.parse(response.data);
        return { items: sessions, ...(sessions.length === limit && { next_cursor: String(offset + sessions.length) }) };
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
