import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    organization_id: z.string().describe('Organization identifier. Example: "org_abc123"'),
    connection_id: z.string().describe('Connection identifier. Example: "con_def456"'),
    assign_membership_on_login: z
        .boolean()
        .optional()
        .describe('When true, all users that log in with this connection will be automatically granted membership in the organization.'),
    is_signup_enabled: z
        .boolean()
        .optional()
        .describe('Determines whether organization signup should be enabled for this organization connection. Only applicable for database connections.'),
    show_as_button: z
        .boolean()
        .optional()
        .describe("Determines whether a connection should be displayed on this organization's login prompt. Only applicable for enterprise connections.")
});

const OrganizationConnectionSchema = z
    .object({
        name: z.string().optional(),
        strategy: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    connection_id: z.string(),
    assign_membership_on_login: z.boolean().optional(),
    show_as_button: z.boolean().optional(),
    is_signup_enabled: z.boolean().optional(),
    connection: OrganizationConnectionSchema.optional()
});

const action = createAction({
    description: 'Update an enabled connection for an organization in Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-organization-connection'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['update:organization_connections'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: {
            assign_membership_on_login?: boolean;
            is_signup_enabled?: boolean;
            show_as_button?: boolean;
        } = {};
        if (input.assign_membership_on_login !== undefined) {
            data.assign_membership_on_login = input.assign_membership_on_login;
        }
        if (input.is_signup_enabled !== undefined) {
            data.is_signup_enabled = input.is_signup_enabled;
        }
        if (input.show_as_button !== undefined) {
            data.show_as_button = input.show_as_button;
        }

        const response = await nango.patch({
            // https://auth0.com/docs/api/management/v2/organizations/patch-enabled-connections-by-connection-id
            endpoint: `/api/v2/organizations/${encodeURIComponent(input.organization_id)}/enabled_connections/${encodeURIComponent(input.connection_id)}`,
            data,
            retries: 3
        });

        const providerResponse = OutputSchema.parse(response.data);
        return providerResponse;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
