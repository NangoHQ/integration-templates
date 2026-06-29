import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.union([z.number(), z.string()]).describe('User ID or email address. Example: 1981305')
});

const ProviderUserSchema = z.object({
    id: z.number(),
    direct_link: z.string(),
    name: z.string(),
    email: z.string(),
    available: z.boolean(),
    availability_status: z.string(),
    created_at: z.string(),
    time_zone: z.string(),
    language: z.string(),
    substatus: z.string().nullable().optional(),
    wrap_up_time: z.number(),
    extension: z.string().nullable().optional(),
    default_number_id: z.number().nullable().optional(),
    state: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    direct_link: z.string(),
    name: z.string(),
    email: z.string(),
    available: z.boolean(),
    availability_status: z.string(),
    created_at: z.string(),
    time_zone: z.string(),
    language: z.string(),
    substatus: z.string().optional(),
    wrap_up_time: z.number(),
    extension: z.string().optional(),
    default_number_id: z.number().optional(),
    state: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single user from Aircall.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public_api'],
    endpoint: {
        method: 'GET',
        path: '/actions/get-user'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.aircall.io/api-references/#retrieve-a-user-v2
            endpoint: `/v2/users/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const ResponseSchema = z.object({
            user: ProviderUserSchema
        });

        const parsed = ResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found or unexpected response format',
                id: input.id
            });
        }

        const providerUser = parsed.data.user;

        return {
            id: providerUser.id,
            direct_link: providerUser.direct_link,
            name: providerUser.name,
            email: providerUser.email,
            available: providerUser.available,
            availability_status: providerUser.availability_status,
            created_at: providerUser.created_at,
            time_zone: providerUser.time_zone,
            language: providerUser.language,
            ...(providerUser.substatus != null && { substatus: providerUser.substatus }),
            wrap_up_time: providerUser.wrap_up_time,
            ...(providerUser.extension != null && { extension: providerUser.extension }),
            ...(providerUser.default_number_id != null && { default_number_id: providerUser.default_number_id }),
            ...(providerUser.state !== undefined && { state: providerUser.state })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
