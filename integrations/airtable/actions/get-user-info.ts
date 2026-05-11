import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderWhoamiSchema = z.object({
    id: z.string(),
    scopes: z.array(z.string()).optional(),
    email: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    scopes: z.array(z.string()).optional(),
    email: z.string().optional()
});

const action = createAction({
    description: 'Retrieve information about the authenticated Airtable user and scopes.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-user-info',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://airtable.com/developers/web/api/get-user-id-scopes
        const response = await nango.get({
            endpoint: '/v0/meta/whoami',
            retries: 3
        });

        const data = ProviderWhoamiSchema.parse(response.data);

        return {
            id: data.id,
            ...(data.scopes !== undefined && { scopes: data.scopes }),
            ...(data.email !== undefined && { email: data.email })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
