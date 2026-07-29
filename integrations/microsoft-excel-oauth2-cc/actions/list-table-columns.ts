import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    driveId: z.string().describe('The drive ID containing the workbook. Example: "b!PkCXTGMWc0aQ-tL4aQtFEDRX0SkZPfZDl2tD7OP_gahvi-nd5TAvTJG6KTmx6Mm0"'),
    itemId: z.string().describe('The workbook item ID. Example: "01RFYLAYDQCQAOBGW2GVAYDEQMDDBL6JYU"'),
    tableIdOrName: z.string().describe('The table ID or name. Example: "Table1"')
});

const ProviderColumnSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        index: z.number().optional(),
        values: z.array(z.unknown()).optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    value: z.array(ProviderColumnSchema)
});

const ColumnSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    index: z.number().optional(),
    values: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    columns: z.array(ColumnSchema)
});

const action = createAction({
    description: 'List the columns of a table',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.Read.All', 'Sites.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // OData string literals require embedded single quotes to be doubled.
        const encodedTableIdOrName = encodeURIComponent(input.tableIdOrName.replace(/'/g, "''"));
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/graph/api/resources/excel
            endpoint: `/v1.0/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}/workbook/tables('${encodedTableIdOrName}')/columns`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            columns: providerResponse.value.map((col) => ({
                id: col.id,
                ...(col.name !== undefined && { name: col.name }),
                ...(col.index !== undefined && { index: col.index }),
                ...(col.values !== undefined && { values: col.values })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
