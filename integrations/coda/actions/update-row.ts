import { z } from 'zod';
import { createAction } from 'nango';

const CellSchema = z.object({
    column: z.string().describe('Column ID or name. Example: "c-i_UwVI012F"'),
    value: z.unknown().describe('New value for the cell.')
});

const InputSchema = z.object({
    docId: z.string().describe('Doc ID. Example: "6O6-VWsNpq"'),
    tableIdOrName: z.string().describe('Table ID or name. Example: "grid-tE68GY5gIp"'),
    rowIdOrName: z.string().describe('Row ID or name. Example: "i-qdoCaT1Gba"'),
    cells: z.array(CellSchema).min(1).describe('Cells to update.')
});

const ProviderResponseSchema = z.object({
    id: z.string(),
    requestId: z.string()
});

const OutputSchema = z.object({
    id: z.string(),
    requestId: z.string()
});

const action = createAction({
    description: 'Update cells in a specific row.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['doc:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://coda.io/developers/apis/v1#operation/updateRow
            endpoint: `/docs/${encodeURIComponent(input.docId)}/tables/${encodeURIComponent(input.tableIdOrName)}/rows/${encodeURIComponent(input.rowIdOrName)}`,
            data: {
                row: {
                    cells: input.cells.map((cell) => ({
                        column: cell.column,
                        value: cell.value
                    }))
                }
            },
            retries: 1
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            id: providerData.id,
            requestId: providerData.requestId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
