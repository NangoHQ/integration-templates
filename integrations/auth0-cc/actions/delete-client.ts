import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    client_id: z.string().describe('The ID of the client to delete. Example: "abc123def456"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    client_id: z.string()
});

const action = createAction({
    description: 'Delete a client in Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-client',
        group: 'Clients'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['delete:clients'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://auth0.com/docs/api/management/v2#!/Clients/delete_clients_by_id
        await nango.delete({
            endpoint: `/api/v2/clients/${encodeURIComponent(input.client_id)}`,
            retries: 3
        });

        return {
            success: true,
            client_id: input.client_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
