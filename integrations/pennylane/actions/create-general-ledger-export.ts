import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    period_start: z.string().describe('Start date of the period to export (ISO 8601). Example: "2026-01-01"'),
    period_end: z.string().describe('End date of the period to export (ISO 8601). Example: "2026-01-31"')
});

const ProviderExportSchema = z
    .object({
        id: z.union([z.string(), z.number()]),
        status: z.string().optional(),
        period_start: z.string().optional(),
        period_end: z.string().optional(),
        download_url: z.string().optional(),
        file_url: z.string().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.union([z.string(), z.number()]),
    status: z.string().optional(),
    period_start: z.string().optional(),
    period_end: z.string().optional(),
    download_url: z.string().optional(),
    created_at: z.string().optional()
});

const action = createAction({
    description: 'Create a General Ledger export job.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['exports:gl'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/exportgeneralledger
            endpoint: '/api/external/v2/exports/general_ledgers',
            data: {
                period_start: input.period_start,
                period_end: input.period_end
            },
            retries: 3
        };

        const response = await nango.post(config);

        const providerExport = ProviderExportSchema.parse(response.data);

        return {
            id: providerExport.id,
            ...(providerExport.status !== undefined && { status: providerExport.status }),
            ...(providerExport.period_start !== undefined && { period_start: providerExport.period_start }),
            ...(providerExport.period_end !== undefined && { period_end: providerExport.period_end }),
            ...((providerExport.download_url ?? providerExport.file_url) !== undefined && {
                download_url: providerExport.download_url ?? providerExport.file_url
            }),
            ...(providerExport.created_at !== undefined && { created_at: providerExport.created_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
