import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Aircall user ID. Example: 1981305'),
    name: z.string().optional().describe('Full name of the user.'),
    email: z.string().email().optional().describe('Email of the user.'),
    language: z.string().optional().describe('User preferred language (IETF tag). Example: en-US'),
    time_zone: z.string().optional().describe('User timezone. Example: America/New_York'),
    wrap_up_time: z.number().optional().describe('Wrap-up time in seconds after a call.'),
    extension: z.string().optional().describe('User extension.'),
    default_number_id: z.number().optional().describe('Default number ID for the user.')
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
    wrap_up_time: z.number(),
    extension: z.string().nullable().optional(),
    substatus: z.string().nullable().optional(),
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
    time_zone: z.string(),
    language: z.string(),
    wrap_up_time: z.number(),
    extension: z.string().optional(),
    substatus: z.string().optional(),
    default_number_id: z.number().optional()
});

const action = createAction({
    version: '1.0.0',
    description: 'Update a user in Aircall.',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public_api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};

        if (input.name !== undefined) {
            body['name'] = input.name;
        }
        if (input.email !== undefined) {
            body['email'] = input.email;
        }
        if (input.language !== undefined) {
            body['language'] = input.language;
        }
        if (input.time_zone !== undefined) {
            body['time_zone'] = input.time_zone;
        }
        if (input.wrap_up_time !== undefined) {
            body['wrap_up_time'] = input.wrap_up_time;
        }
        if (input.extension !== undefined) {
            body['extension'] = input.extension;
        }
        if (input.default_number_id !== undefined) {
            body['default_number_id'] = input.default_number_id;
        }

        const response = await nango.put({
            // https://developer.aircall.io/api-references/#update-a-user-v2
            endpoint: `/v2/users/${encodeURIComponent(String(input.id))}`,
            data: body,
            retries: 3
        });

        const raw = response.data;
        if (raw === null || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Aircall API'
            });
        }

        const userData = 'user' in raw ? raw.user : raw;
        if (userData === null || typeof userData !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Missing user object in Aircall API response'
            });
        }

        const providerUser = ProviderUserSchema.parse(userData);

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
            wrap_up_time: providerUser.wrap_up_time,
            ...(providerUser.extension != null && { extension: providerUser.extension }),
            ...(providerUser.substatus != null && { substatus: providerUser.substatus }),
            ...(providerUser.default_number_id != null && { default_number_id: providerUser.default_number_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
