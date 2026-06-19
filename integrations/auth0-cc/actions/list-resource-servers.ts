import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const ProviderResourceServerScopeSchema = z
    .object({
        value: z.string(),
        description: z.string().optional().nullable()
    })
    .passthrough();

const ProviderResourceServerSchema = z
    .object({
        id: z.string(),
        name: z.string().optional().nullable(),
        identifier: z.string().optional().nullable(),
        is_system: z.boolean().optional().nullable(),
        scopes: z.array(ProviderResourceServerScopeSchema).optional().nullable(),
        signing_alg: z.string().optional().nullable(),
        token_lifetime: z.number().optional().nullable(),
        allow_offline_access: z.boolean().optional().nullable()
    })
    .passthrough();

const ResourceServerScopeSchema = z.object({
    value: z.string(),
    description: z.string().optional()
});

const ResourceServerSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    identifier: z.string().optional(),
    is_system: z.boolean().optional(),
    scopes: z.array(ResourceServerScopeSchema).optional(),
    signing_alg: z.string().optional(),
    token_lifetime: z.number().optional(),
    allow_offline_access: z.boolean().optional()
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page index). Omit for the first page.'),
    per_page: z.number().optional().describe('Number of results per page. Maximum 100.')
});

const PaginatedResponseSchema = z.object({
    start: z.number(),
    limit: z.number(),
    total: z.number(),
    resource_servers: z.array(ProviderResourceServerSchema)
});

const OutputSchema = z.object({
    items: z.array(ResourceServerSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List API resource servers in Auth0.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:resource_servers'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (Number.isNaN(page) || page < 0) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a non-negative integer string.'
            });
        }

        const perPage = input.per_page ?? 50;
        if (perPage < 1 || perPage > 100) {
            throw new nango.ActionError({
                type: 'invalid_per_page',
                message: 'per_page must be between 1 and 100.'
            });
        }

        const config: ProxyConfiguration = {
            // https://auth0.com/docs/api/management/v2/resource-servers/get-resource-servers
            endpoint: '/api/v2/resource-servers',
            params: {
                page: String(page),
                per_page: String(perPage),
                include_totals: 'true'
            },
            retries: 3
        };

        const response = await nango.get(config);

        const mapResourceServer = (item: z.infer<typeof ProviderResourceServerSchema>): z.infer<typeof ResourceServerSchema> => ({
            id: item.id,
            ...(item.name != null && { name: item.name }),
            ...(item.identifier != null && { identifier: item.identifier }),
            ...(item.is_system != null && { is_system: item.is_system }),
            ...(item.scopes != null && {
                scopes: item.scopes.map((scope) => ({
                    value: scope.value,
                    ...(scope.description != null && { description: scope.description })
                }))
            }),
            ...(item.signing_alg != null && { signing_alg: item.signing_alg }),
            ...(item.token_lifetime != null && { token_lifetime: item.token_lifetime }),
            ...(item.allow_offline_access != null && { allow_offline_access: item.allow_offline_access })
        });

        if (Array.isArray(response.data)) {
            const items = z.array(ProviderResourceServerSchema).parse(response.data);
            return { items: items.map(mapResourceServer) };
        }

        const paginated = PaginatedResponseSchema.parse(response.data);
        const hasNextPage = paginated.start + paginated.limit < paginated.total;
        const nextCursor = hasNextPage ? String(page + 1) : undefined;

        return {
            items: paginated.resource_servers.map(mapResourceServer),
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
