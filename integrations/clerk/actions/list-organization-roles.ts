import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor returned by a previous request. Omit for the first page.'),
    limit: z.number().int().min(1).max(500).optional(),
    query: z.string().optional(),
    order_by: z.string().optional()
});
const ResourceSchema = z
    .object({
        id: z.string(),
        object: z.string().optional(),
        name: z.string(),
        key: z.string(),
        description: z.string().nullable().optional(),
        permissions: z.array(z.object({ id: z.string(), key: z.string().optional(), name: z.string().optional() }).passthrough()).optional(),
        created_at: z.number().optional(),
        updated_at: z.number().optional()
    })
    .passthrough();
const ProviderResponseSchema = z.object({ data: z.array(ResourceSchema), total_count: z.number() });
const OutputSchema = z.object({ items: z.array(ResourceSchema), next_cursor: z.string().optional(), total: z.number() });
const action = createAction({
    description: 'List Clerk organization roles.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const offset = input.cursor === undefined ? 0 : Number.parseInt(input.cursor, 10);
        if (!Number.isInteger(offset) || offset < 0) throw new nango.ActionError({ type: 'invalid_cursor', message: 'Cursor must be a non-negative integer.' });
        const response = await nango.get({
            // https://clerk.com/docs/reference/backend-api/tag/Organization-Roles#operation/ListOrganizationRoles
            endpoint: '/v1/organization_roles',
            params: {
                offset: String(offset),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.query !== undefined && { query: input.query }),
                ...(input.order_by !== undefined && { order_by: input.order_by })
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
