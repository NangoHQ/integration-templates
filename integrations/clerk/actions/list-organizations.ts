import { z } from 'zod';
import { createAction } from 'nango';
const InputSchema = z.object({
    cursor: z.string().optional(),
    limit: z.number().int().min(1).max(500).optional(),
    query: z.string().optional(),
    order_by: z.string().optional().describe('Sort by name, created_at, or members_count, prefixed with + or -.'),
    organization_id: z.array(z.string()).max(100).optional(),
    include_members_count: z.boolean().optional()
});
const OrganizationSchema = z
    .object({
        id: z.string(),
        object: z.string().optional(),
        name: z.string(),
        slug: z.string(),
        image_url: z.string().optional(),
        has_image: z.boolean().optional(),
        members_count: z.number().optional(),
        max_allowed_memberships: z.number().optional(),
        admin_delete_enabled: z.boolean().optional(),
        public_metadata: z.record(z.string(), z.unknown()).nullable().optional(),
        private_metadata: z.record(z.string(), z.unknown()).optional(),
        created_by: z.string().optional(),
        created_at: z.number().optional(),
        updated_at: z.number().optional()
    })
    .passthrough();
const ProviderResponseSchema = z.object({ data: z.array(OrganizationSchema), total_count: z.number() });
const OutputSchema = z.object({ items: z.array(OrganizationSchema), next_cursor: z.string().optional(), total: z.number() });
const action = createAction({
    description: 'List organizations from Clerk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const offset = input.cursor === undefined ? 0 : Number.parseInt(input.cursor, 10);
        if (!Number.isInteger(offset) || offset < 0) throw new nango.ActionError({ type: 'invalid_cursor', message: 'Cursor must be a non-negative integer.' });
        const response = await nango.get({
            // https://clerk.com/docs/reference/backend-api/tag/Organizations#operation/GetOrganizationList
            endpoint: '/v1/organizations',
            params: {
                offset: String(offset),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.query !== undefined && { query: input.query }),
                ...(input.order_by !== undefined && { order_by: input.order_by }),
                ...(input.organization_id !== undefined && { organization_id: input.organization_id }),
                ...(input.include_members_count !== undefined && { include_members_count: String(input.include_members_count) })
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
