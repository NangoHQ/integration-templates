import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    per_page: z.number().min(1).max(100).optional().describe('Number of results per page. Defaults to 50.'),
    strategy: z.array(z.string()).optional().describe('Filter by connection strategies.'),
    name: z.string().optional().describe('Filter by connection name.'),
    fields: z.string().optional().describe('Comma-separated list of fields to include or exclude.'),
    include_fields: z.boolean().optional().describe('Whether specified fields are included (true) or excluded (false). Defaults to true.')
});

const ProviderConnectionSchema = z.object({
    id: z.string(),
    name: z.string(),
    display_name: z.string().optional(),
    strategy: z.string(),
    realms: z.array(z.string()).optional(),
    is_domain_connection: z.boolean().optional(),
    show_as_button: z.boolean().optional(),
    metadata: z.record(z.string(), z.string().nullable()).optional(),
    options: z.unknown().optional(),
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

const ProviderCheckpointPaginatedResponseSchema = z.object({
    next: z.string().optional(),
    connections: z.array(ProviderConnectionSchema)
});

const ProviderOffsetPaginatedResponseSchema = z.object({
    start: z.number(),
    limit: z.number(),
    total: z.number(),
    connections: z.array(ProviderConnectionSchema)
});

const ProviderArrayResponseSchema = z.array(ProviderConnectionSchema);

const ConnectionOutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    display_name: z.string().optional(),
    strategy: z.string(),
    realms: z.array(z.string()).optional(),
    is_domain_connection: z.boolean().optional(),
    show_as_button: z.boolean().optional(),
    metadata: z.record(z.string(), z.string().nullable()).optional(),
    options: z.unknown().optional(),
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
    items: z.array(ConnectionOutputSchema),
    next_cursor: z.string().optional()
});

interface Connection {
    id: string;
    name: string;
    display_name?: string | undefined;
    strategy: string;
    realms?: string[] | undefined;
    is_domain_connection?: boolean | undefined;
    show_as_button?: boolean | undefined;
    metadata?: Record<string, string | null> | undefined;
    options?: unknown | undefined;
    authentication?: { active: boolean } | undefined;
    connected_accounts?: { active: boolean; cross_app_access?: boolean | undefined } | undefined;
}

const action = createAction({
    description: 'List connections from Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-connections',
        group: 'Connections'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:connections'],

    exec: async (nango, input) => {
        const config: ProxyConfiguration = {
            // https://auth0.com/docs/api/management/v2/connections/get-all-connections
            endpoint: '/api/v2/connections',
            params: {
                ...(input.cursor !== undefined && { from: input.cursor }),
                ...(input.per_page !== undefined && { take: String(input.per_page) }),
                ...(input.strategy !== undefined && input.strategy.length > 0 && { strategy: input.strategy.join(',') }),
                ...(input.name !== undefined && { name: input.name }),
                ...(input.fields !== undefined && { fields: input.fields }),
                ...(input.include_fields !== undefined && { include_fields: String(input.include_fields) })
            },
            retries: 3
        };
        const response = await nango.get(config);

        let connections: Connection[] = [];
        let nextCursor: string | undefined;

        const checkpointParsed = ProviderCheckpointPaginatedResponseSchema.safeParse(response.data);
        if (checkpointParsed.success) {
            connections = checkpointParsed.data.connections;
            nextCursor = checkpointParsed.data.next;
        } else {
            const offsetParsed = ProviderOffsetPaginatedResponseSchema.safeParse(response.data);
            if (offsetParsed.success) {
                connections = offsetParsed.data.connections;
                const currentPage = Math.floor(offsetParsed.data.start / offsetParsed.data.limit);
                const totalPages = Math.ceil(offsetParsed.data.total / offsetParsed.data.limit);
                if (currentPage + 1 < totalPages) {
                    nextCursor = String(currentPage + 1);
                }
            } else {
                const arrayParsed = ProviderArrayResponseSchema.safeParse(response.data);
                if (arrayParsed.success) {
                    connections = arrayParsed.data;
                }
            }
        }

        return {
            items: connections.map((connection) => ({
                id: connection.id,
                name: connection.name,
                ...(connection.display_name !== undefined && { display_name: connection.display_name }),
                strategy: connection.strategy,
                ...(connection.realms !== undefined && { realms: connection.realms }),
                ...(connection.is_domain_connection !== undefined && { is_domain_connection: connection.is_domain_connection }),
                ...(connection.show_as_button !== undefined && { show_as_button: connection.show_as_button }),
                ...(connection.metadata !== undefined && { metadata: connection.metadata }),
                ...(connection.options !== undefined && { options: connection.options }),
                ...(connection.authentication !== undefined && { authentication: connection.authentication }),
                ...(connection.connected_accounts !== undefined && { connected_accounts: connection.connected_accounts })
            })),
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
