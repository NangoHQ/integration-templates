import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    docId: z.string().describe('ID of the Coda doc. Example: "L_hgEASd6n"'),
    tableType: z.enum(['table', 'view', 'formula', 'detail']).optional().describe('Single table type to filter by. Do not use comma-separated values.'),
    sortBy: z.enum(['name', 'createdAt']).optional().describe('Sort order for results.'),
    limit: z.number().int().min(1).optional().describe('Maximum number of results to return.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderParentSchema = z.object({
    id: z.string(),
    type: z.string(),
    href: z.string(),
    browserLink: z.string(),
    name: z.string()
});

const ProviderTableSchema = z.object({
    id: z.string(),
    type: z.string(),
    tableType: z.string().optional(),
    href: z.string(),
    browserLink: z.string(),
    name: z.string(),
    parent: ProviderParentSchema.optional()
});

const ProviderListTablesResponseSchema = z.object({
    items: z.array(ProviderTableSchema),
    nextPageToken: z.string().optional(),
    nextPageLink: z.string().optional(),
    href: z.string().optional()
});

const TableSchema = z.object({
    id: z.string(),
    type: z.string(),
    tableType: z.string().optional(),
    href: z.string(),
    browserLink: z.string(),
    name: z.string(),
    parent: ProviderParentSchema.optional()
});

const OutputSchema = z.object({
    items: z.array(TableSchema),
    nextPageToken: z.string().optional()
});

const action = createAction({
    description: 'List tables and views in a doc.',
    version: '1.0.0',
    endpoint: {
        path: '/actions/list-tables',
        method: 'GET'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://coda.io/developers/apis/v1
            endpoint: `/docs/${encodeURIComponent(input.docId)}/tables`,
            params: {
                ...(input.tableType !== undefined && { tableTypes: input.tableType }),
                ...(input.sortBy !== undefined && { sortBy: input.sortBy }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.cursor !== undefined && { pageToken: input.cursor })
            },
            retries: 3
        });

        const providerResponse = ProviderListTablesResponseSchema.parse(response.data);

        return {
            items: providerResponse.items.map((item) => ({
                id: item.id,
                type: item.type,
                ...(item.tableType !== undefined && { tableType: item.tableType }),
                href: item.href,
                browserLink: item.browserLink,
                name: item.name,
                ...(item.parent !== undefined && { parent: item.parent })
            })),
            ...(providerResponse.nextPageToken !== undefined && { nextPageToken: providerResponse.nextPageToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
