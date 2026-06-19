import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    organization_id: z.string().describe('Organization identifier. Example: "org_abc123"')
});

const ConnectionInformationSchema = z.object({
    name: z.string().optional(),
    strategy: z.string().optional()
});

const OrganizationConnectionSchema = z.object({
    connection_id: z.string(),
    assign_membership_on_login: z.boolean().optional(),
    show_as_button: z.boolean().optional(),
    is_signup_enabled: z.boolean().optional(),
    connection: ConnectionInformationSchema.optional()
});

const OutputSchema = z.object({
    connections: z.array(OrganizationConnectionSchema)
});

const PaginatedResponseSchema = z.object({
    start: z.number(),
    limit: z.number(),
    total: z.number(),
    enabled_connections: z.array(z.unknown())
});

const action = createAction({
    description: 'List the enabled connections for an organization in Auth0.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:organization_connections'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const allConnections: z.infer<typeof OrganizationConnectionSchema>[] = [];
        const perPage = 100;
        let page = 0;
        let hasMore = true;

        while (hasMore) {
            // https://auth0.com/docs/api/management/v2/organizations/get-enabled-connections
            const response = await nango.get({
                endpoint: `/api/v2/organizations/${encodeURIComponent(input.organization_id)}/enabled_connections`,
                params: {
                    page: String(page),
                    per_page: String(perPage),
                    include_totals: 'true'
                },
                retries: 3
            });

            if (Array.isArray(response.data)) {
                const items = z.array(z.unknown()).parse(response.data);
                if (items.length === 0) {
                    hasMore = false;
                } else {
                    for (const item of items) {
                        const connection = OrganizationConnectionSchema.parse(item);
                        allConnections.push(connection);
                    }
                    page += 1;
                }
            } else {
                const paginated = PaginatedResponseSchema.parse(response.data);
                for (const item of paginated.enabled_connections) {
                    const connection = OrganizationConnectionSchema.parse(item);
                    allConnections.push(connection);
                }
                const totalPages = Math.ceil(paginated.total / perPage);
                page += 1;
                if (page >= totalPages) {
                    hasMore = false;
                }
            }
        }

        return {
            connections: allConnections
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
