import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('The unique identifier of the user. Example: "104094154"')
});

const TeamSchema = z.object({
    id: z.string(),
    name: z.string().optional()
});

const ProviderUserSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    url: z.string(),
    photo_thumb: z.string().optional().nullable(),
    photo_original: z.string().optional().nullable(),
    created_at: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    time_zone_identifier: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
    teams: z.array(TeamSchema).optional().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    url: z.string(),
    photo_thumb: z.string().optional(),
    photo_original: z.string().optional(),
    created_at: z.string().optional(),
    location: z.string().optional(),
    time_zone_identifier: z.string().optional(),
    title: z.string().optional(),
    teams: z.array(TeamSchema).optional()
});

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

const action = createAction({
    description: 'Retrieve a single user from monday.com',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!/^\d+$/.test(input.userId)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'userId must be a numeric string'
            });
        }

        // https://developer.monday.com/api-reference/reference/users
        const response = await nango.post({
            endpoint: '/v2',
            headers: {
                'api-version': '2026-04'
            },
            data: {
                query: `query { users(ids: [${input.userId}]) { id name email url photo_thumb photo_original created_at location time_zone_identifier title teams { id name } } }`
            },
            retries: 3
        });

        const rawData = response.data;
        if (!isObject(rawData)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from monday.com API'
            });
        }

        if (Array.isArray(rawData['errors']) && rawData['errors'].length > 0) {
            const firstError = rawData['errors'][0];
            const message = isObject(firstError) && typeof firstError['message'] === 'string' ? firstError['message'] : 'GraphQL error';
            throw new nango.ActionError({
                type: 'provider_error',
                message
            });
        }

        const users = rawData['data'];
        if (!isObject(users)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Missing data.users in monday.com API response'
            });
        }

        const userList = users['users'];
        if (!Array.isArray(userList) || userList.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `User with ID ${input.userId} not found`
            });
        }

        const providerUser = ProviderUserSchema.parse(userList[0]);

        return {
            id: providerUser.id,
            name: providerUser.name,
            email: providerUser.email,
            url: providerUser.url,
            ...(providerUser.photo_thumb != null && { photo_thumb: providerUser.photo_thumb }),
            ...(providerUser.photo_original != null && { photo_original: providerUser.photo_original }),
            ...(providerUser.created_at != null && { created_at: providerUser.created_at }),
            ...(providerUser.location != null && { location: providerUser.location }),
            ...(providerUser.time_zone_identifier != null && { time_zone_identifier: providerUser.time_zone_identifier }),
            ...(providerUser.title != null && { title: providerUser.title }),
            ...(providerUser.teams != null && { teams: providerUser.teams })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
