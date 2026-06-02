import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the connection to delete. Example: "con_abc123"')
});

const OutputSchema = z.object({
    id: z.string(),
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a connection in Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-connection',
        group: 'Connections'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['delete:connections'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://auth0.com/docs/api/management/v2#!/Connections/delete_connections_by_id
        await nango.delete({
            endpoint: `/api/v2/connections/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        return {
            id: input.id,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
