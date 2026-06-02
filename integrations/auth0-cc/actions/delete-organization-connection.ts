import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    organization_id: z.string().describe('Organization ID. Example: "org_abc123"'),
    connection_id: z.string().describe('Connection ID. Example: "con_def456"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Remove an enabled connection from an organization in Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-organization-connection',
        group: 'Organizations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['update:organizations'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://auth0.com/docs/api/management/v2/organizations/delete-enabled-connection
            endpoint: `/api/v2/organizations/${encodeURIComponent(input.organization_id)}/enabled_connections/${encodeURIComponent(input.connection_id)}`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
