import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor returned by a previous request. Omit for the first page.'),
    cursor_direction: z.enum(['after', 'before']).optional().describe('Direction for the cursor. Defaults to after.'),
    limit: z.number().int().min(1).max(100).optional(),
    order: z.enum(['asc', 'desc']).optional(),
    directory: z.string().optional().describe('Filter users by directory ID.'),
    group: z.string().optional().describe('Filter users by directory group ID.'),
    idp_id: z.string().optional().describe('Filter users by the identity provider user ID.'),
    email: z.string().email().optional().describe('Filter users by email address.')
});
const DirectoryGroupSchema = z
    .object({
        id: z.string(),
        idp_id: z.string(),
        directory_id: z.string(),
        organization_id: z.string().nullable(),
        name: z.string(),
        created_at: z.string(),
        updated_at: z.string(),
        raw_attributes: z.record(z.string(), z.unknown())
    })
    .passthrough();
const DirectoryUserSchema = z
    .object({
        object: z.literal('directory_user'),
        id: z.string(),
        directory_id: z.string(),
        organization_id: z.string().nullable(),
        idp_id: z.string(),
        first_name: z.string().nullable(),
        last_name: z.string().nullable(),
        email: z.string().nullable(),
        state: z.enum(['active', 'inactive']),
        role: z.record(z.string(), z.unknown()).optional(),
        roles: z.array(z.record(z.string(), z.unknown())).optional(),
        raw_attributes: z.record(z.string(), z.unknown()),
        custom_attributes: z.record(z.string(), z.unknown()).optional(),
        groups: z.array(DirectoryGroupSchema),
        created_at: z.string(),
        updated_at: z.string()
    })
    .passthrough();
const ProviderResponseSchema = z.object({
    object: z.literal('list').optional(),
    data: z.array(DirectoryUserSchema),
    list_metadata: z.object({ after: z.string().nullable().optional(), before: z.string().nullable().optional() })
});
const OutputSchema = z.object({ items: z.array(DirectoryUserSchema), next_cursor: z.string().optional() });

const action = createAction({
    description: 'List directory users from WorkOS Directory Sync.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const cursorDirection = input.cursor_direction ?? 'after';
        const response = await nango.get({
            // https://workos.com/docs/reference/directory-sync/user
            endpoint: '/directory_users',
            params: {
                ...(input.cursor !== undefined && { [cursorDirection]: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.order !== undefined && { order: input.order }),
                ...(input.directory !== undefined && { directory: input.directory }),
                ...(input.group !== undefined && { group: input.group }),
                ...(input.idp_id !== undefined && { idp_id: input.idp_id }),
                ...(input.email !== undefined && { email: input.email })
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
