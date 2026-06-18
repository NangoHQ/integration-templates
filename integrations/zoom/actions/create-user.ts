import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    action: z.enum(['create', 'autoCreate', 'custCreate', 'ssoCreate']),
    user_info: z.object({
        email: z.string(),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        password: z.string().optional(),
        type: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(99)])
    })
});

const ProviderResponseSchema = z.object({
    id: z.string(),
    email: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    type: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(99)])
});

const OutputSchema = z.object({
    id: z.string(),
    email: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    type: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(99)])
});

const action = createAction({
    description: 'Create a user in Zoom',
    version: '2.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user:write:admin', 'user:write'],

    exec: async (nango, input) => {
        const response = await nango.post({
            // https://developers.zoom.us/docs/api/rest/reference/user-management/users/#post-users
            endpoint: '/users',
            data: {
                action: input.action,
                user_info: {
                    email: input.user_info.email,
                    type: input.user_info.type,
                    ...(input.user_info.first_name !== undefined && { first_name: input.user_info.first_name }),
                    ...(input.user_info.last_name !== undefined && { last_name: input.user_info.last_name }),
                    ...(input.user_info.password !== undefined && { password: input.user_info.password })
                }
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoom API',
                details: parsed.error.format()
            });
        }

        return {
            id: parsed.data.id,
            email: parsed.data.email,
            type: parsed.data.type,
            ...(parsed.data.first_name != null && { first_name: parsed.data.first_name }),
            ...(parsed.data.last_name != null && { last_name: parsed.data.last_name })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
