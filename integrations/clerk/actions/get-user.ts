import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({ user_id: z.string().min(1).describe('Clerk user ID. Example: "user_2abc123"') });
const UserSchema = z
    .object({
        id: z.string(),
        object: z.string().optional(),
        username: z.string().nullable().optional(),
        first_name: z.string().nullable().optional(),
        last_name: z.string().nullable().optional(),
        image_url: z.string().optional(),
        primary_email_address_id: z.string().nullable().optional(),
        primary_phone_number_id: z.string().nullable().optional(),
        external_id: z.string().nullable().optional(),
        banned: z.boolean().optional(),
        locked: z.boolean().optional(),
        created_at: z.number().optional(),
        updated_at: z.number().optional(),
        locale: z.string().nullable().optional()
    })
    .passthrough();
const OutputSchema = UserSchema;

const action = createAction({
    description: 'Retrieve a Clerk user by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://clerk.com/docs/reference/backend-api/tag/Users#operation/GetUser
        const response = await nango.get({ endpoint: `/v1/users/${encodeURIComponent(input.user_id)}`, retries: 3 });
        return UserSchema.parse(response.data);
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
