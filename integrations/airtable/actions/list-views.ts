import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    baseId: z.string().describe('The ID of the Airtable base. Example: "appXXXXXXXXXXXXXXXX"'),
    tableId: z.string().optional().describe('Optional table ID to filter views by table. Example: "tblXXXXXXXXXXXXXXXX"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderViewSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string()
});

const ProviderTableSchema = z.object({
    id: z.string(),
    name: z.string(),
    views: z.array(ProviderViewSchema).optional()
});

const ProviderTablesResponseSchema = z.object({
    tables: z.array(ProviderTableSchema)
});

const ViewSchema = z.object({
    id: z.string().describe('Unique identifier for the view'),
    name: z.string().describe('Name of the view'),
    type: z.string().describe('Type of view (e.g., grid, form, gallery, kanban)'),
    tableId: z.string().optional().describe('ID of the table containing this view'),
    tableName: z.string().optional().describe('Name of the table containing this view')
});

const OutputSchema = z.object({
    views: z.array(ViewSchema).describe('List of views in the base'),
    next_cursor: z.string().optional().describe('Cursor for the next page of results')
});

const action = createAction({
    description: 'List views available in an Airtable base',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-views',
        group: 'Views'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://airtable.com/developers/web/api/get-base-schema
        const response = await nango.get({
            endpoint: `/v0/meta/bases/${input.baseId}/tables`,
            params: {
                ...(input.cursor && { cursor: input.cursor })
            },
            retries: 3
        });

        const parsed = ProviderTablesResponseSchema.parse(response.data);

        const allViews: Array<{
            id: string;
            name: string;
            type: string;
            tableId?: string;
            tableName?: string;
        }> = [];

        for (const table of parsed.tables) {
            // If tableId filter is specified, skip other tables
            if (input.tableId && table.id !== input.tableId) {
                continue;
            }

            const tableViews = table.views || [];
            for (const view of tableViews) {
                allViews.push({
                    id: view.id,
                    name: view.name,
                    type: view.type,
                    tableId: table.id,
                    tableName: table.name
                });
            }
        }

        return {
            views: allViews,
            ...(response.data.next_cursor != null && {
                next_cursor: response.data.next_cursor
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
