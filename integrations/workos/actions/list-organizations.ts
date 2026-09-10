import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor returned by a previous request. Omit for the first page.'),
    cursor_direction: z.enum(['after', 'before']).optional().describe('Direction for the cursor. Defaults to after.'),
    limit: z.number().int().min(1).max(100).optional().describe('Maximum number of organizations to return.'),
    order: z.enum(['asc', 'desc']).optional(),
    domains: z.array(z.string()).optional().describe('Return organizations matching any of these domains.')
});
const OrganizationSchema = z
    .object({
        object: z.literal('organization'),
        id: z.string(),
        name: z.string(),
        allow_profiles_outside_organization: z.boolean(),
        domains: z.array(z.record(z.string(), z.unknown())),
        stripe_customer_id: z.string().nullable().optional(),
        created_at: z.string(),
        updated_at: z.string(),
        external_id: z.string().nullable().optional(),
        metadata: z.record(z.string(), z.string()).optional()
    })
    .passthrough();
const ProviderResponseSchema = z.object({
    object: z.literal('list').optional(),
    data: z.array(OrganizationSchema),
    list_metadata: z.object({ after: z.string().nullable().optional(), before: z.string().nullable().optional() })
});
const OutputSchema = z.object({ items: z.array(OrganizationSchema), next_cursor: z.string().optional() });

const action = createAction({
    description: 'List organizations from WorkOS.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const cursorDirection = input.cursor_direction ?? 'after';
        const response = await nango.get({
            // https://workos.com/docs/reference/organization
            endpoint: '/organizations',
            params: {
                ...(input.cursor !== undefined && { [cursorDirection]: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.order !== undefined && { order: input.order }),
                ...(input.domains !== undefined && { domains: input.domains })
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
