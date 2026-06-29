import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    docId: z.string().describe('ID of the Coda doc. Example: "AbCDeFGH"'),
    tableIdOrName: z.string().describe('ID or name of the table. Example: "grid-pqRst-U"')
});

const ColumnReferenceSchema = z.object({
    id: z.string(),
    type: z.string(),
    href: z.string()
});

const PageReferenceSchema = z.object({
    id: z.string(),
    type: z.string(),
    href: z.string(),
    browserLink: z.string(),
    name: z.string()
});

const TableReferenceSchema = z.object({
    id: z.string(),
    type: z.string(),
    tableType: z.string(),
    href: z.string(),
    browserLink: z.string(),
    name: z.string(),
    parent: PageReferenceSchema.optional()
});

const SortSchema = z.object({
    column: ColumnReferenceSchema,
    direction: z.string()
});

const FilterSchema = z.object({
    valid: z.boolean(),
    isVolatile: z.boolean(),
    hasUserFormula: z.boolean(),
    hasTodayFormula: z.boolean(),
    hasNowFormula: z.boolean()
});

const ProviderTableSchema = z.object({
    id: z.string(),
    type: z.string(),
    tableType: z.string(),
    href: z.string(),
    browserLink: z.string(),
    name: z.string(),
    parent: PageReferenceSchema,
    displayColumn: ColumnReferenceSchema,
    rowCount: z.number(),
    sorts: z.array(SortSchema),
    layout: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    viewId: z.string().optional(),
    parentTable: TableReferenceSchema.optional(),
    filter: FilterSchema.optional()
});

const OutputSchema = ProviderTableSchema;

const action = createAction({
    description: 'Retrieve a single table or view by ID or name.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/get-table',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://coda.io/developers/apis/v1#tag/Tables/operation/getTable
            endpoint: `/docs/${encodeURIComponent(input.docId)}/tables/${encodeURIComponent(input.tableIdOrName)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Table not found',
                docId: input.docId,
                tableIdOrName: input.tableIdOrName
            });
        }

        const table = ProviderTableSchema.parse(response.data);
        return table;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
