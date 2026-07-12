import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    period_start: z.string().describe('Start date of the period to export. Example: "2023-08-30"'),
    period_end: z.string().describe('End date of the period to export. Example: "2023-08-30"')
});

const ProviderExportSchema = z.object({
    id: z.number().describe('ID of the export. Example: 124'),
    status: z.enum(['pending', 'ready', 'error']).describe('The state of the export'),
    created_at: z.string().describe('Creation timestamp. Example: "2023-08-30T10:08:08.146343Z"'),
    updated_at: z.string().describe('Last update timestamp. Example: "2023-08-30T10:08:08.146343Z"')
});

const OutputSchema = z.object({
    id: z.number().describe('ID of the export. Example: 124'),
    status: z.enum(['pending', 'ready', 'error']).describe('The state of the export'),
    created_at: z.string().describe('Creation timestamp. Example: "2023-08-30T10:08:08.146343Z"'),
    updated_at: z.string().describe('Last update timestamp. Example: "2023-08-30T10:08:08.146343Z"')
});

const action = createAction({
    description: 'Create a FEC export job.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['exports:fec'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://pennylane.readme.io/reference/exportfec
            endpoint: '/api/external/v2/exports/fecs',
            data: {
                period_start: input.period_start,
                period_end: input.period_end
            },
            retries: 1
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
