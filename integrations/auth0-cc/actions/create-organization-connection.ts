import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    organization_id: z.string().describe('Organization identifier. Example: "org_abc123"'),
    connection_id: z.string().describe('Single connection ID to add to the organization. Example: "con_def456"'),
    assign_membership_on_login: z
        .boolean()
        .optional()
        .describe('When true, all users that log in with this connection will be automatically granted membership in the organization.')
});

const ConnectionInfoSchema = z
    .object({
        name: z.string().optional(),
        strategy: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    connection_id: z.string(),
    assign_membership_on_login: z.boolean().optional(),
    show_as_button: z.boolean().optional(),
    is_signup_enabled: z.boolean().optional(),
    connection: ConnectionInfoSchema.optional()
});

const OutputSchema = z.object({
    connection_id: z.string(),
    assign_membership_on_login: z.boolean().optional(),
    show_as_button: z.boolean().optional(),
    is_signup_enabled: z.boolean().optional(),
    connection: ConnectionInfoSchema.optional()
});

const action = createAction({
    description: 'Enable a connection for an organization in Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-organization-connection',
        group: 'Organizations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['create:organization_connections'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://auth0.com/docs/api/management/v2/organizations/post-enabled-connections
            endpoint: `/api/v2/organizations/${encodeURIComponent(input.organization_id)}/enabled_connections`,
            data: {
                connection_id: input.connection_id,
                ...(input.assign_membership_on_login !== undefined && { assign_membership_on_login: input.assign_membership_on_login })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            connection_id: providerResponse.connection_id,
            ...(providerResponse.assign_membership_on_login !== undefined && { assign_membership_on_login: providerResponse.assign_membership_on_login }),
            ...(providerResponse.show_as_button !== undefined && { show_as_button: providerResponse.show_as_button }),
            ...(providerResponse.is_signup_enabled !== undefined && { is_signup_enabled: providerResponse.is_signup_enabled }),
            ...(providerResponse.connection !== undefined && { connection: providerResponse.connection })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
