import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderUserSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    time_zone: z.string().optional(),
    ip_address: z.string().optional(),
    status: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ProviderResponseSchema = z.object({
    user: ProviderUserSchema
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    time_zone: z.string().optional(),
    ip_address: z.string().optional(),
    status: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Get the profile of the user this connection authenticates as.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['hubstaff:read', 'email', 'openid', 'profile'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.hubstaff.com/
            endpoint: 'v2/users/me',
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const user = providerResponse.user;

        return {
            id: user.id,
            ...(user.name !== undefined && { name: user.name }),
            ...(user.first_name !== undefined && { first_name: user.first_name }),
            ...(user.last_name !== undefined && { last_name: user.last_name }),
            ...(user.email !== undefined && { email: user.email }),
            ...(user.time_zone !== undefined && { time_zone: user.time_zone }),
            ...(user.ip_address !== undefined && { ip_address: user.ip_address }),
            ...(user.status !== undefined && { status: user.status }),
            ...(user.created_at !== undefined && { created_at: user.created_at }),
            ...(user.updated_at !== undefined && { updated_at: user.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
