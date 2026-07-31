import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    driveId: z.string().describe('Drive ID. Example: "b!PkCXTGMWc0aQ-tL4aQtFEDRX0SkZPfZDl2tD7OP_gahvi-nd5TAvTJG6KTmx6Mm0"'),
    itemId: z.string().describe('Workbook item ID. Example: "01RFYLAYDQCQAOBGW2GVAYDEQMDDBL6JYU"'),
    worksheetIdOrName: z.string().describe('Worksheet ID or name. Example: "Sheet1"'),
    type: z.string().describe('Chart type. Example: "ColumnClustered"'),
    sourceData: z.string().describe('Source data range. Example: "Sheet1!B1:B3"'),
    seriesBy: z.string().optional().describe('How the series is arranged. Example: "Auto"')
});

const ProviderChartSchema = z.object({
    id: z.string(),
    name: z.string(),
    height: z.number().optional(),
    width: z.number().optional(),
    top: z.number().optional(),
    left: z.number().optional()
});

const OutputSchema = ProviderChartSchema;

const action = createAction({
    description: 'Create a chart on a worksheet from a data range.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // OData string literals require embedded single quotes to be doubled.
        const encodedWorksheet = encodeURIComponent(input.worksheetIdOrName.replace(/'/g, "''"));

        const response = await nango.post({
            // https://learn.microsoft.com/en-us/graph/api/chartcollection-add
            endpoint: `/v1.0/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}/workbook/worksheets('${encodedWorksheet}')/charts/add`,
            data: {
                type: input.type,
                sourceData: input.sourceData,
                ...(input.seriesBy !== undefined && { seriesBy: input.seriesBy })
            },
            retries: 3
        });

        return ProviderChartSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
