import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    docId: z.string().describe('Doc ID. Example: "wGUhBwDpCh"'),
    tableId: z.string().describe('Table ID or name. Example: "table-x21g6d40h7"'),
    visibleOnly: z.boolean().optional().describe('If true, only returns visible columns.'),
    limit: z.number().int().optional().describe('Maximum number of results to return.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderColumnSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        name: z.string(),
        href: z.string().optional(),
        display: z.boolean().optional(),
        calculated: z.boolean().optional(),
        format: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const ProviderListSchema = z.object({
    items: z.array(ProviderColumnSchema),
    href: z.string().optional(),
    nextPageToken: z.string().optional(),
    nextPageLink: z.string().optional()
});

const ColumnSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    href: z.string().optional(),
    display: z.boolean().optional(),
    calculated: z.boolean().optional(),
    format: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    items: z.array(ColumnSchema),
    nextPageToken: z.string().optional()
});

const action = createAction({
    description: 'List columns in a table.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-columns'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://coda.io/developers/apis/v1#tag/Columns/operation/listColumns
            endpoint: `/docs/${encodeURIComponent(input.docId)}/tables/${encodeURIComponent(input.tableId)}/columns`,
            params: {
                ...(input.visibleOnly !== undefined && { visibleOnly: String(input.visibleOnly) }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.cursor !== undefined && { pageToken: input.cursor })
            },
            retries: 3
        });

        const providerList = ProviderListSchema.parse(response.data);

        return {
            items: providerList.items.map((item) => ({
                id: item.id,
                type: item.type,
                name: item.name,
                ...(item.href !== undefined && { href: item.href }),
                ...(item.display !== undefined && { display: item.display }),
                ...(item.calculated !== undefined && { calculated: item.calculated }),
                ...(item.format !== undefined && { format: item.format })
            })),
            ...(providerList.nextPageToken !== undefined && { nextPageToken: providerList.nextPageToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
