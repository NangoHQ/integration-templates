import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z
        .string()
        .max(128)
        .describe(
            'The name of the connection. Must start and end with an alphanumeric character and can only contain alphanumeric characters and "-". Max length 128.'
        ),
    strategy: z.string().describe('The identity provider identifier for the connection. Example: "auth0", "google-oauth2", "samlp".'),
    display_name: z.string().max(128).optional().describe('Connection name used in the new universal login experience.'),
    options: z.record(z.string(), z.unknown()).optional().describe("The connection's options (depend on the connection strategy)."),
    enabled_clients: z.array(z.string()).optional().describe('The ids of the clients for which the connection is to be enabled.'),
    is_domain_connection: z.boolean().optional().describe('True promotes to a domain-level connection so that third-party applications can use it.'),
    show_as_button: z.boolean().optional().describe('Enables showing a button for the connection in the login page (new experience only).'),
    realms: z.array(z.string()).optional().describe('Defines the realms for which the connection will be used (ie: email domains).'),
    metadata: z
        .record(z.string(), z.string().nullable())
        .optional()
        .describe(
            'Metadata associated with the connection in the form of an object with string values (max 255 chars). Maximum of 10 metadata properties allowed.'
        ),
    authentication: z
        .object({
            active: z.boolean()
        })
        .optional()
        .describe('Configure the purpose of a connection to be used for authentication during login.'),
    connected_accounts: z
        .object({
            active: z.boolean(),
            cross_app_access: z.boolean().optional()
        })
        .optional()
        .describe('Configure the purpose of a connection to be used for connected accounts and Token Vault.')
});

const ProviderConnectionSchema = z.object({
    id: z.string(),
    name: z.string(),
    display_name: z.string().optional().nullable(),
    strategy: z.string(),
    realms: z.array(z.string()).optional().nullable(),
    enabled_clients: z.array(z.string()).optional().nullable(),
    is_domain_connection: z.boolean().optional().nullable(),
    show_as_button: z.boolean().optional().nullable(),
    metadata: z.record(z.string(), z.string().nullable()).optional().nullable(),
    authentication: z
        .object({
            active: z.boolean()
        })
        .optional()
        .nullable(),
    connected_accounts: z
        .object({
            active: z.boolean(),
            cross_app_access: z.boolean().optional().nullable()
        })
        .optional()
        .nullable(),
    options: z.unknown().optional().nullable()
});

const OutputSchema = z.object({
    id: z.string().describe("The connection's identifier."),
    name: z.string().describe('The name of the connection.'),
    display_name: z.string().optional().describe('Connection name used in login screen.'),
    strategy: z.string().describe('The type of the connection, related to the identity provider.'),
    realms: z.array(z.string()).optional().describe('Defines the realms for which the connection will be used.'),
    enabled_clients: z.array(z.string()).optional().describe('The client ids for which the connection is enabled.'),
    is_domain_connection: z.boolean().optional().describe('True if the connection is domain level.'),
    show_as_button: z.boolean().optional().describe('Enables showing a button for the connection in the login page.'),
    metadata: z.record(z.string(), z.string().nullable()).optional().describe('Metadata associated with the connection.'),
    authentication: z
        .object({
            active: z.boolean()
        })
        .optional()
        .describe('Authentication purpose configuration.'),
    connected_accounts: z
        .object({
            active: z.boolean(),
            cross_app_access: z.boolean().optional()
        })
        .optional()
        .describe('Connected accounts purpose configuration.'),
    options: z.unknown().optional().describe("The connection's options.")
});

const action = createAction({
    description: 'Create a connection in Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-connection',
        group: 'Connections'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['create:connections'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://auth0.com/docs/api/management/v2/connections/post-connections
            endpoint: '/api/v2/connections',
            data: {
                name: input.name,
                strategy: input.strategy,
                ...(input.display_name !== undefined && { display_name: input.display_name }),
                ...(input.options !== undefined && { options: input.options }),
                ...(input.enabled_clients !== undefined && { enabled_clients: input.enabled_clients }),
                ...(input.is_domain_connection !== undefined && { is_domain_connection: input.is_domain_connection }),
                ...(input.show_as_button !== undefined && { show_as_button: input.show_as_button }),
                ...(input.realms !== undefined && { realms: input.realms }),
                ...(input.metadata !== undefined && { metadata: input.metadata }),
                ...(input.authentication !== undefined && { authentication: input.authentication }),
                ...(input.connected_accounts !== undefined && { connected_accounts: input.connected_accounts })
            },
            retries: 3
        });

        const providerConnection = ProviderConnectionSchema.parse(response.data);

        return {
            id: providerConnection.id,
            name: providerConnection.name,
            strategy: providerConnection.strategy,
            ...(providerConnection.display_name != null && { display_name: providerConnection.display_name }),
            ...(providerConnection.realms != null && { realms: providerConnection.realms }),
            ...(providerConnection.enabled_clients != null && { enabled_clients: providerConnection.enabled_clients }),
            ...(providerConnection.is_domain_connection != null && { is_domain_connection: providerConnection.is_domain_connection }),
            ...(providerConnection.show_as_button != null && { show_as_button: providerConnection.show_as_button }),
            ...(providerConnection.metadata != null && { metadata: providerConnection.metadata }),
            ...(providerConnection.authentication != null && { authentication: providerConnection.authentication }),
            ...(providerConnection.connected_accounts != null && {
                connected_accounts: {
                    active: providerConnection.connected_accounts.active,
                    ...(providerConnection.connected_accounts.cross_app_access != null && {
                        cross_app_access: providerConnection.connected_accounts.cross_app_access
                    })
                }
            }),
            ...(providerConnection.options != null && { options: providerConnection.options })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
