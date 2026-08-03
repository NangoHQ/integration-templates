import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    driveId: z.string().describe('Drive ID containing the workbook. Example: "b!PkCXTGMWc0aQ-tL4aQtFEDRX0SkZPfZDl2tD7OP_gahvi-nd5TAvTJG6KTmx6Mm0"'),
    itemId: z.string().describe('Workbook item ID. Example: "01RFYLAYDQCQAOBGW2GVAYDEQMDDBL6JYU"'),
    tableIdOrName: z.string().describe('Table ID or name. Example: "Table1"')
});

const GraphTableRowSchema = z.object({
    index: z.number(),
    values: z.array(z.array(z.unknown()))
});

const GraphTableRowsResponseSchema = z.object({
    value: z.array(GraphTableRowSchema).optional().default([]),
    '@odata.nextLink': z.string().optional()
});

const OutputSchema = z.object({
    rows: z.array(GraphTableRowSchema),
    nextLink: z.string().optional()
});

const action = createAction({
    description: 'List the data rows of a table.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.Read.All', 'Sites.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // OData string literals require embedded single quotes to be doubled.
        const encodedTable = encodeURIComponent(input.tableIdOrName.replace(/'/g, "''"));

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/graph/api/table-list-rows
            endpoint: `/v1.0/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}/workbook/tables('${encodedTable}')/rows`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Microsoft Graph API.'
            });
        }

        const parsed = GraphTableRowsResponseSchema.parse(response.data);

        return {
            rows: parsed.value,
            ...(parsed['@odata.nextLink'] != null && { nextLink: parsed['@odata.nextLink'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
