import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor returned by a previous request. Omit for the first page.'),
    cursor_direction: z.enum(['after', 'before']).optional().describe('Direction for the cursor. Defaults to after.'),
    limit: z.number().int().min(1).max(100).optional(),
    order: z.enum(['asc', 'desc']).optional(),
    connection_type: z.string().optional(),
    domain: z.string().optional(),
    organization_id: z.string().optional(),
    search: z.string().optional()
});
const ResourceSchema = z
    .object({
        object: z.literal('connection'),
        id: z.string(),
        organization_id: z.string().optional(),
        connection_type: z.string(),
        name: z.string(),
        state: z.enum(['requires_type', 'draft', 'active', 'validating', 'inactive', 'deleting']),
        status: z.enum(['linked', 'unlinked']),
        domains: z.array(z.object({ id: z.string(), object: z.literal('connection_domain'), domain: z.string() }).passthrough()),
        created_at: z.string(),
        updated_at: z.string()
    })
    .passthrough();
const ProviderResponseSchema = z.object({
    object: z.literal('list').optional(),
    data: z.array(ResourceSchema),
    list_metadata: z.object({ after: z.string().nullable().optional(), before: z.string().nullable().optional() })
});
const OutputSchema = z.object({ items: z.array(ResourceSchema), next_cursor: z.string().optional() });
const action = createAction({
    description: 'List WorkOS SSO connections.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const cursorDirection = input.cursor_direction ?? 'after';
        const response = await nango.get({
            // https://workos.com/docs/reference/sso/connection
            endpoint: '/connections',
            params: {
                ...(input.cursor !== undefined && { [cursorDirection]: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.order !== undefined && { order: input.order }),
                ...(input.connection_type !== undefined && { connection_type: input.connection_type }),
                ...(input.domain !== undefined && { domain: input.domain }),
                ...(input.organization_id !== undefined && { organization_id: input.organization_id }),
                ...(input.search !== undefined && { search: input.search })
            },
            retries: 3
        });
        const provider = ProviderResponseSchema.parse(response.data);
        const nextCursor = cursorDirection === 'before' ? provider.list_metadata.before : provider.list_metadata.after;
        return { items: provider.data, ...(nextCursor != null && { next_cursor: nextCursor }) };
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
