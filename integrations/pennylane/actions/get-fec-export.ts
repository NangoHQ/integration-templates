import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Existing export identifier (id). Example: 124')
});

const ProviderExportSchema = z.object({
    id: z.number(),
    file_url: z.string().nullable(),
    status: z.enum(['pending', 'ready', 'error']),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    id: z.number().describe('ID of the export'),
    file_url: z.string().optional().describe('URL to download the export file. The URL will expire after 30 minutes.'),
    status: z.enum(['pending', 'ready', 'error']).describe('The state of the export'),
    created_at: z.string().describe('Creation timestamp'),
    updated_at: z.string().describe('Last update timestamp')
});

const action = createAction({
    description: 'Retrieve FEC export job metadata',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['exports:fec'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getfecexport
            endpoint: `/api/external/v2/exports/fecs/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Export not found or invalid response',
                export_id: input.id
            });
        }

        const providerExport = ProviderExportSchema.parse(response.data);

        return {
            id: providerExport.id,
            ...(providerExport.file_url != null && { file_url: providerExport.file_url }),
            status: providerExport.status,
            created_at: providerExport.created_at,
            updated_at: providerExport.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
