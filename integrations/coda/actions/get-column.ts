import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    docId: z.string().describe('ID of the doc. Example: "AbCDeFGH"'),
    tableId: z.string().describe('ID or name of the table. Example: "grid-pqRst-U"'),
    columnId: z.string().describe('ID or name of the column. Example: "c-tuVwxYz"')
});

const ColumnFormatSchema = z.object({}).passthrough();

const PageReferenceSchema = z
    .object({
        id: z.string().optional(),
        type: z.string().optional(),
        href: z.string().optional(),
        name: z.string().optional()
    })
    .passthrough()
    .optional();

const ParentTableSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        tableType: z.string(),
        href: z.string(),
        browserLink: z.string(),
        name: z.string(),
        parent: PageReferenceSchema
    })
    .passthrough();

const ProviderColumnSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        name: z.string(),
        href: z.string(),
        display: z.boolean().optional(),
        calculated: z.boolean().optional(),
        formula: z.string().optional(),
        defaultValue: z.string().optional(),
        format: ColumnFormatSchema.optional(),
        parent: ParentTableSchema.optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a single column by ID or name.',
    version: '1.0.0',
    input: InputSchema,
    output: ProviderColumnSchema,
    endpoint: {
        method: 'GET',
        path: '/actions/get-column'
    },
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof ProviderColumnSchema>> => {
        const response = await nango.get({
            // https://coda.io/developers/apis/v1#tag/Columns/operation/getColumn
            endpoint: `/docs/${encodeURIComponent(input.docId)}/tables/${encodeURIComponent(input.tableId)}/columns/${encodeURIComponent(input.columnId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Column not found',
                docId: input.docId,
                tableId: input.tableId,
                columnId: input.columnId
            });
        }

        const providerColumn = ProviderColumnSchema.parse(response.data);
        return providerColumn;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
