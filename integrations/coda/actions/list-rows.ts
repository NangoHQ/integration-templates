import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    docId: z.string().describe('ID of the doc. Example: AbCDeFGH'),
    tableIdOrName: z.string().describe('ID or name of the table. Example: grid-pqRst-U'),
    useColumnNames: z.boolean().optional().describe('Use column names instead of column IDs in the returned output'),
    valueFormat: z.enum(['simple', 'simpleWithArrays', 'rich']).optional().describe('The format that cell values are returned as'),
    sortBy: z.enum(['natural', 'id', 'updatedAt']).optional().describe('Specifies the sort order of the rows returned'),
    visibleOnly: z.boolean().optional().describe('If true, returns only visible rows and columns for the table'),
    query: z.string().optional().describe('Query used to filter returned rows, specified as <column_id_or_name>:<value>'),
    limit: z.number().optional().describe('Maximum number of results to return'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Maps to the pageToken parameter.')
});

const ProviderRowSchema = z.object({
    id: z.string(),
    type: z.string(),
    href: z.string(),
    name: z.string().optional(),
    index: z.number().optional(),
    browserLink: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    values: z.record(z.string(), z.unknown()).optional()
});

const ProviderListResponseSchema = z.object({
    items: z.array(ProviderRowSchema),
    href: z.string().optional(),
    nextPageToken: z.string().optional(),
    nextPageLink: z.string().optional(),
    nextSyncToken: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ProviderRowSchema),
    nextPageToken: z.string().optional(),
    nextPageLink: z.string().optional(),
    nextSyncToken: z.string().optional(),
    href: z.string().optional()
});

const action = createAction({
    description: 'List rows in a table with optional filtering and pagination.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/list-rows',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.useColumnNames !== undefined) {
            params['useColumnNames'] = String(input.useColumnNames);
        }
        if (input.valueFormat !== undefined) {
            params['valueFormat'] = input.valueFormat;
        }
        if (input.sortBy !== undefined) {
            params['sortBy'] = input.sortBy;
        }
        if (input.visibleOnly !== undefined) {
            params['visibleOnly'] = String(input.visibleOnly);
        }
        if (input.query !== undefined) {
            params['query'] = input.query;
        }
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.cursor !== undefined) {
            params['pageToken'] = input.cursor;
        }

        // https://coda.io/developers/apis/v1#tag/Rows/operation/listRows
        const response = await nango.get({
            endpoint: `/docs/${encodeURIComponent(input.docId)}/tables/${encodeURIComponent(input.tableIdOrName)}/rows`,
            params,
            retries: 3
        });

        const providerResponse = ProviderListResponseSchema.parse(response.data);

        return {
            items: providerResponse.items,
            ...(providerResponse.nextPageToken !== undefined && { nextPageToken: providerResponse.nextPageToken }),
            ...(providerResponse.nextPageLink !== undefined && { nextPageLink: providerResponse.nextPageLink }),
            ...(providerResponse.nextSyncToken !== undefined && { nextSyncToken: providerResponse.nextSyncToken }),
            ...(providerResponse.href !== undefined && { href: providerResponse.href })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
