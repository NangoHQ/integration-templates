import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderWhoamiSchema = z.object({
    id: z.string().describe('The user ID. Example: "usrX9e810wHn3mMLz"'),
    email: z.string().optional().describe('The user email address. Example: "user@example.com"'),
    scopes: z.array(z.string()).optional().describe('The OAuth scopes granted to the connection. Example: ["data.records:read", "data.records:write"]')
});

const OutputSchema = z.object({
    id: z.string().describe('The user ID. Example: "usrX9e810wHn3mMLz"'),
    email: z.string().optional().describe('The user email address. Example: "user@example.com"'),
    scopes: z.array(z.string()).optional().describe('The OAuth scopes granted to the connection. Example: ["data.records:read", "data.records:write"]')
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
    scopes: ['user.email:read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://airtable.com/developers/web/api/whoami
        const response = await nango.get({
            endpoint: '/v0/meta/whoami',
            retries: 3
        });

        const whoami = ProviderWhoamiSchema.parse(response.data);

        return {
            id: whoami.id,
            ...(whoami.email !== undefined && { email: whoami.email }),
            ...(whoami.scopes !== undefined && { scopes: whoami.scopes })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
