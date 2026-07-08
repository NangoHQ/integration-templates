import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('ID of the Analytical General Ledger export. Example: 124')
});

const ProviderExportSchema = z.object({
    id: z.number(),
    file_url: z.string().nullable(),
    status: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    id: z.number(),
    file_url: z.string().optional(),
    status: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

const action = createAction({
    description: 'Retrieve Analytical General Ledger export job metadata',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['exports:agl'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getanalyticalgeneralledgerexport.md
            endpoint: `/api/external/v2/exports/analytical_general_ledgers/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const providerExport = ProviderExportSchema.parse(response.data);

        return {
            id: providerExport.id,
            status: providerExport.status,
            created_at: providerExport.created_at,
            updated_at: providerExport.updated_at,
            ...(providerExport.file_url != null && { file_url: providerExport.file_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
