import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor returned by a previous request. Omit for the first page.'),
    cursor_direction: z.enum(['after', 'before']).optional().describe('Direction for the cursor. Defaults to after.'),
    limit: z.number().int().min(1).max(100).optional(),
    order: z.enum(['asc', 'desc']).optional(),
    organization_id: z.string().optional(),
    user_id: z.string().optional(),
    statuses: z.array(z.enum(['active', 'inactive', 'pending'])).optional()
});
const ResourceSchema = z
    .object({
        object: z.literal('organization_membership'),
        id: z.string(),
        user_id: z.string(),
        organization_id: z.string(),
        status: z.enum(['active', 'inactive', 'pending']),
        directory_managed: z.boolean(),
        organization_name: z.string().optional(),
        custom_attributes: z.record(z.string(), z.unknown()).optional(),
        role: z.object({ slug: z.string() }).passthrough().optional(),
        roles: z.array(z.object({ slug: z.string() }).passthrough()).optional(),
        user: z.object({ id: z.string() }).passthrough().optional(),
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
    description: 'List WorkOS organization memberships.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const cursorDirection = input.cursor_direction ?? 'after';
        const response = await nango.get({
            // https://workos.com/docs/reference/user-management/organization-membership
            endpoint: '/user_management/organization_memberships',
            params: {
                ...(input.cursor !== undefined && { [cursorDirection]: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.order !== undefined && { order: input.order }),
                ...(input.organization_id !== undefined && { organization_id: input.organization_id }),
                ...(input.user_id !== undefined && { user_id: input.user_id }),
                ...(input.statuses !== undefined && { statuses: input.statuses.join(',') })
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
