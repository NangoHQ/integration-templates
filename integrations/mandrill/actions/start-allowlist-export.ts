import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    notify_email: z.string().email().optional().describe('Optional email address to notify when the export job has finished. Example: "admin@example.com"')
});

const ProviderExportSchema = z.object({
    id: z.string(),
    created_at: z.string(),
    type: z.enum(['reject', 'whitelist', 'allowlist', 'activity']),
    finished_at: z.string().nullable().optional(),
    state: z.enum(['waiting', 'working', 'complete', 'error', 'expired']),
    result_url: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    created_at: z.string(),
    type: z.string(),
    finished_at: z.string().optional(),
    state: z.string(),
    result_url: z.string().optional()
});

const action = createAction({
    description: "Begin an asynchronous export of the account's rejection allowlist.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://mailchimp.com/developer/transactional/api/exports/export-allowlist/
            endpoint: '/1.0/exports/allowlist.json',
            data: {
                ...(input.notify_email !== undefined && { notify_email: input.notify_email })
            },
            retries: 3
        };

        const response = await nango.post(config);

        const exportJob = ProviderExportSchema.parse(response.data);

        return {
            id: exportJob.id,
            created_at: exportJob.created_at,
            type: exportJob.type,
            ...(exportJob.finished_at != null && { finished_at: exportJob.finished_at }),
            state: exportJob.state,
            ...(exportJob.result_url != null && { result_url: exportJob.result_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
