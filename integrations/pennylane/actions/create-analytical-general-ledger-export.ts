import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    period_start: z.string().describe('Start date of the period to export. Example: "2023-08-30"'),
    period_end: z.string().describe('End date of the period to export. Example: "2023-08-30"'),
    mode: z.enum(['in_line', 'in_column']).optional().describe('The mode of the export. Defaults to in_line.')
});

const ProviderExportSchema = z.object({
    id: z.number(),
    status: z.enum(['pending', 'ready', 'error']),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    id: z.number(),
    status: z.enum(['pending', 'ready', 'error']),
    created_at: z.string(),
    updated_at: z.string()
});

const action = createAction({
    description: 'Create an Analytical General Ledger export job.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['exports:agl'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://pennylane.readme.io/reference/exportanalyticalgeneralledger
            endpoint: '/api/external/v2/exports/analytical_general_ledgers',
            data: {
                period_start: input.period_start,
                period_end: input.period_end,
                ...(input.mode !== undefined && { mode: input.mode })
            },
            retries: 3
        });

        const providerExport = ProviderExportSchema.parse(response.data);

        return {
            id: providerExport.id,
            status: providerExport.status,
            created_at: providerExport.created_at,
            updated_at: providerExport.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
