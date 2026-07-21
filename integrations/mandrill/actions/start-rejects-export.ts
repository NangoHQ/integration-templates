import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    notify_email: z.string().optional().describe('Optional email address to notify when the export job has finished. Example: "admin@example.com"')
});

const ProviderExportSchema = z.object({
    id: z.string(),
    created_at: z.string(),
    type: z.string(),
    state: z.string(),
    finished_at: z.string().nullable().optional(),
    result_url: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    created_at: z.string(),
    type: z.string(),
    state: z.string(),
    finished_at: z.string().optional(),
    result_url: z.string().optional()
});

const action = createAction({
    description: "Begin an asynchronous export of the account's rejection denylist.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/exports/export-denylist/
            endpoint: '1.0/exports/rejects.json',
            data: {
                ...(input.notify_email !== undefined && { notify_email: input.notify_email })
            },
            retries: 3
        });

        const providerExport = ProviderExportSchema.parse(response.data);

        return {
            id: providerExport.id,
            created_at: providerExport.created_at,
            type: providerExport.type,
            state: providerExport.state,
            ...(providerExport.finished_at != null && { finished_at: providerExport.finished_at }),
            ...(providerExport.result_url != null && { result_url: providerExport.result_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
