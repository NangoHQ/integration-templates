import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Existing General Ledger export identifier. Example: 1')
});

const ProviderExportSchema = z.object({
    id: z.number(),
    file_url: z.string().nullable(),
    status: z.enum(['pending', 'ready', 'error']),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    id: z.number(),
    file_url: z.string().optional(),
    status: z.enum(['pending', 'ready', 'error']),
    created_at: z.string(),
    updated_at: z.string()
});

const action = createAction({
    description: 'Retrieve General Ledger export job metadata.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['exports:gl'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getgeneralledgerexport
            endpoint: `/api/external/v2/exports/general_ledgers/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'General Ledger export not found',
                id: input.id
            });
        }

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
