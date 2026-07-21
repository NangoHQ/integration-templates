import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique identifier of the export job. Example: "2023-01-01 12:20:28.13842"')
});

const ProviderExportInfoSchema = z.object({
    id: z.string(),
    created_at: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    finished_at: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    result_url: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    created_at: z.string().optional(),
    type: z.string().optional(),
    finished_at: z.string().optional(),
    state: z.string().optional(),
    result_url: z.string().optional()
});

const action = createAction({
    description: 'Get the status and (if finished) download URL of an export job.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/exports/get-export-info/
            endpoint: '1.0/exports/info.json',
            data: {
                id: input.id
            },
            retries: 3
        });

        const providerExport = ProviderExportInfoSchema.parse(response.data);

        return {
            id: providerExport.id,
            ...(providerExport.created_at != null && { created_at: providerExport.created_at }),
            ...(providerExport.type != null && { type: providerExport.type }),
            ...(providerExport.finished_at != null && { finished_at: providerExport.finished_at }),
            ...(providerExport.state != null && { state: providerExport.state }),
            ...(providerExport.result_url != null && { result_url: providerExport.result_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
