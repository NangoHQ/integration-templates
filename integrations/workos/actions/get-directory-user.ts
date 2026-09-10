import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({ directory_user_id: z.string() });
const GroupSchema = z
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
const ResourceSchema = z
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
        groups: z.array(GroupSchema),
        created_at: z.string(),
        updated_at: z.string()
    })
    .passthrough();
const OutputSchema = ResourceSchema;
const action = createAction({
    description: 'Get a WorkOS directory user and their groups.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://workos.com/docs/reference/directory-sync/user
            endpoint: `/directory_users/${encodeURIComponent(input.directory_user_id)}`,

            retries: 3
        });
        return ResourceSchema.parse(response.data);
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
