import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email: z.string().email().describe('User email. Must be valid and unique. Example: "john.doe@aircall.io"'),
    first_name: z.string().describe('User first name. Example: "John"'),
    last_name: z.string().describe('User last name. Example: "Doe"'),
    language: z.string().optional().describe('User preferred language in IETF format. Example: "en-US"'),
    time_zone: z.string().optional().describe('User timezone. Example: "America/New_York"'),
    wrap_up_time: z.number().int().optional().describe('Wrap-up time in whole seconds after a call. Example: 30'),
    extension: z.string().optional().describe('User extension. Example: "001"')
});

const ProviderUserSchema = z.object({
    id: z.number(),
    direct_link: z.string(),
    name: z.string(),
    email: z.string(),
    available: z.boolean(),
    availability_status: z.string(),
    created_at: z.string(),
    time_zone: z.string().optional(),
    language: z.string().optional(),
    substatus: z.string().optional(),
    wrap_up_time: z.number().optional(),
    extension: z.string().nullable().optional(),
    default_number_id: z.number().nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    direct_link: z.string(),
    name: z.string(),
    email: z.string(),
    available: z.boolean(),
    availability_status: z.string(),
    created_at: z.string(),
    time_zone: z.string().optional(),
    language: z.string().optional(),
    substatus: z.string().optional(),
    wrap_up_time: z.number().optional(),
    extension: z.string().optional(),
    default_number_id: z.number().optional()
});

const action = createAction({
    description: 'Create a user in Aircall.',
    version: '3.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/create-user',
        method: 'POST'
    },
    scopes: ['public_api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.aircall.io/api-references/#create-a-user-v2
            endpoint: '/v2/users',
            data: {
                email: input.email,
                first_name: input.first_name,
                last_name: input.last_name,
                ...(input.language !== undefined && { language: input.language }),
                ...(input.time_zone !== undefined && { time_zone: input.time_zone }),
                ...(input.wrap_up_time !== undefined && { wrap_up_time: input.wrap_up_time }),
                ...(input.extension !== undefined && { extension: input.extension })
            },
            retries: 10
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Aircall API'
            });
        }

        const providerData = z.object({ user: ProviderUserSchema }).parse(response.data);
        const user = providerData.user;

        return {
            id: user.id,
            direct_link: user.direct_link,
            name: user.name,
            email: user.email,
            available: user.available,
            availability_status: user.availability_status,
            created_at: user.created_at,
            ...(user.time_zone !== undefined && { time_zone: user.time_zone }),
            ...(user.language !== undefined && { language: user.language }),
            ...(user.substatus !== undefined && { substatus: user.substatus }),
            ...(user.wrap_up_time !== undefined && { wrap_up_time: user.wrap_up_time }),
            ...(user.extension != null && { extension: user.extension }),
            ...(user.default_number_id != null && { default_number_id: user.default_number_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
