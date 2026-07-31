import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page: z.number().int().min(0).optional().describe('Page number for pagination. Default is 0.'),
    pageSize: z.number().int().min(1).max(100).optional().describe('Number of results per page. Default is 20, maximum is 100.'),
    filter: z.string().optional().describe('Filter formula for entities.'),
    search: z.string().max(1000).optional().describe('Free-text search across all entity properties.'),
    sortField: z.enum(['name', 'lastUpdated']).optional().describe('Field to sort by. Default is name.'),
    sortDirection: z.enum(['ASC', 'DESC']).optional().describe('Sort direction. Default is DESC.')
});

const ProviderEntitySchema = z.object({
    id: z.string(),
    ironcladId: z.string(),
    name: z.string(),
    status: z.string(),
    lastUpdated: z.string(),
    properties: z.record(z.string(), z.unknown()).optional(),
    namedTypeIds: z.array(z.string()).optional(),
    parentId: z.string().optional()
});

const ProviderResponseSchema = z.object({
    page: z.number(),
    pageSize: z.number(),
    count: z.number(),
    list: z.array(z.unknown())
});

const EntitySchema = z.object({
    id: z.string(),
    ironcladId: z.string(),
    name: z.string(),
    status: z.string(),
    lastUpdated: z.string(),
    properties: z.record(z.string(), z.unknown()).optional(),
    namedTypeIds: z.array(z.string()).optional(),
    parentId: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(EntitySchema),
    page: z.number(),
    pageSize: z.number(),
    count: z.number(),
    nextPage: z.number().optional()
});

const action = createAction({
    description: 'List entities.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.entities.readEntities'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.ironcladapp.com/reference/list-all-entities
            endpoint: '/public/api/v1/entities',
            params: {
                ...(input.page !== undefined && { page: String(input.page) }),
                ...(input.pageSize !== undefined && { pageSize: String(input.pageSize) }),
                ...(input.filter !== undefined && { filter: input.filter }),
                ...(input.search !== undefined && { search: input.search }),
                ...(input.sortField !== undefined && { sortField: input.sortField }),
                ...(input.sortDirection !== undefined && { sortDirection: input.sortDirection })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.list.map((item) => {
            const entity = ProviderEntitySchema.parse(item);
            return {
                id: entity.id,
                ironcladId: entity.ironcladId,
                name: entity.name,
                status: entity.status,
                lastUpdated: entity.lastUpdated,
                ...(entity.properties !== undefined && { properties: entity.properties }),
                ...(entity.namedTypeIds !== undefined && { namedTypeIds: entity.namedTypeIds }),
                ...(entity.parentId !== undefined && { parentId: entity.parentId })
            };
        });

        const hasNextPage = providerResponse.count > (providerResponse.page + 1) * providerResponse.pageSize;

        return {
            items,
            page: providerResponse.page,
            pageSize: providerResponse.pageSize,
            count: providerResponse.count,
            ...(hasNextPage && { nextPage: providerResponse.page + 1 })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
