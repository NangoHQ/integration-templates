import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({ user_id: z.string().min(1).describe('WorkOS user ID. Example: "user_01H..."') });
const UserSchema = z
    .object({
        object: z.literal('user'),
        id: z.string(),
        email: z.string(),
        email_verified: z.boolean(),
        profile_picture_url: z.string().nullable(),
        name: z.string().nullable(),
        first_name: z.string().nullable(),
        last_name: z.string().nullable(),
        last_sign_in_at: z.string().nullable(),
        locale: z.string().nullable(),
        created_at: z.string(),
        updated_at: z.string(),
        external_id: z.string().nullable().optional(),
        metadata: z.record(z.string(), z.string()).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a WorkOS user by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: UserSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof UserSchema>> => {
        const response = await nango.get({
            // https://workos.com/docs/reference/user-management/user
            endpoint: `/user_management/users/${encodeURIComponent(input.user_id)}`,
            retries: 3
        });
        return UserSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
