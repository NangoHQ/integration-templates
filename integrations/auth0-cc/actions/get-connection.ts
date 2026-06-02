import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    connection_id: z.string().describe('The ID of the connection to retrieve. Example: "con_0000000000000001"')
});

const ProviderConnectionSchema = z.object({
    id: z.string(),
    name: z.string(),
    display_name: z.string().optional(),
    strategy: z.string(),
    realms: z.array(z.string()).optional(),
    enabled_clients: z.array(z.string()).optional(),
    is_domain_connection: z.boolean().optional(),
    show_as_button: z.boolean().optional(),
    metadata: z.record(z.string(), z.string().nullable()).optional(),
    options: z.record(z.string(), z.unknown()).optional(),
    authentication: z
        .object({
            active: z.boolean()
        })
        .optional(),
    connected_accounts: z
        .object({
            active: z.boolean(),
            cross_app_access: z.boolean().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    display_name: z.string().optional(),
    strategy: z.string(),
    realms: z.array(z.string()).optional(),
    enabled_clients: z.array(z.string()).optional(),
    is_domain_connection: z.boolean().optional(),
    show_as_button: z.boolean().optional(),
    metadata: z.record(z.string(), z.string().nullable()).optional(),
    options: z.record(z.string(), z.unknown()).optional(),
    authentication: z
        .object({
            active: z.boolean()
        })
        .optional(),
    connected_accounts: z
        .object({
            active: z.boolean(),
            cross_app_access: z.boolean().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Retrieve a single connection from Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-connection',
        group: 'Connections'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:connections'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://auth0.com/docs/api/management/v2/connections/get-connections-by-id
            endpoint: `/api/v2/connections/${encodeURIComponent(input.connection_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Connection not found',
                connection_id: input.connection_id
            });
        }

        const connection = ProviderConnectionSchema.parse(response.data);

        return {
            id: connection.id,
            name: connection.name,
            ...(connection.display_name !== undefined && { display_name: connection.display_name }),
            strategy: connection.strategy,
            ...(connection.realms !== undefined && { realms: connection.realms }),
            ...(connection.enabled_clients !== undefined && { enabled_clients: connection.enabled_clients }),
            ...(connection.is_domain_connection !== undefined && { is_domain_connection: connection.is_domain_connection }),
            ...(connection.show_as_button !== undefined && { show_as_button: connection.show_as_button }),
            ...(connection.metadata !== undefined && { metadata: connection.metadata }),
            ...(connection.options !== undefined && { options: connection.options }),
            ...(connection.authentication !== undefined && { authentication: connection.authentication }),
            ...(connection.connected_accounts !== undefined && { connected_accounts: connection.connected_accounts })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
