import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string(),
    display_name: z.string().max(128).optional(),
    options: z.record(z.string(), z.unknown()).optional(),
    enabled_clients: z.array(z.string()).nullable().optional(),
    is_domain_connection: z.boolean().optional(),
    show_as_button: z.boolean().optional(),
    realms: z.array(z.string()).optional(),
    metadata: z.record(z.string(), z.string().nullable()).optional(),
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
    description: 'Update a connection in Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-connection',
        group: 'Connections'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['update:connections'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};

        if (input.display_name !== undefined) {
            data['display_name'] = input.display_name;
        }
        if (input.options !== undefined) {
            data['options'] = input.options;
        }
        if (input.enabled_clients !== undefined) {
            data['enabled_clients'] = input.enabled_clients;
        }
        if (input.is_domain_connection !== undefined) {
            data['is_domain_connection'] = input.is_domain_connection;
        }
        if (input.show_as_button !== undefined) {
            data['show_as_button'] = input.show_as_button;
        }
        if (input.realms !== undefined) {
            data['realms'] = input.realms;
        }
        if (input.metadata !== undefined) {
            data['metadata'] = input.metadata;
        }
        if (input.authentication !== undefined) {
            data['authentication'] = input.authentication;
        }
        if (input.connected_accounts !== undefined) {
            data['connected_accounts'] = input.connected_accounts;
        }

        if (Object.keys(data).length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one field to update must be provided.'
            });
        }

        // https://auth0.com/docs/api/management/v2/connections/patch-connections-by-id
        const response = await nango.patch({
            endpoint: `/api/v2/connections/${encodeURIComponent(input.id)}`,
            data,
            retries: 3
        });

        const providerConnection = ProviderConnectionSchema.parse(response.data);

        return {
            id: providerConnection.id,
            name: providerConnection.name,
            display_name: providerConnection.display_name,
            strategy: providerConnection.strategy,
            realms: providerConnection.realms,
            enabled_clients: providerConnection.enabled_clients,
            is_domain_connection: providerConnection.is_domain_connection,
            show_as_button: providerConnection.show_as_button,
            metadata: providerConnection.metadata,
            options: providerConnection.options,
            authentication: providerConnection.authentication,
            connected_accounts: providerConnection.connected_accounts
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
