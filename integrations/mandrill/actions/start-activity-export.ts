import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    notify_email: z.string().optional().describe('An optional email address to notify when the export job has finished.'),
    tags: z.array(z.string()).optional().describe('An array of tag names to narrow the export to; will match messages that contain ANY of the tags.'),
    senders: z.array(z.string()).optional().describe('An array of senders to narrow the export to.'),
    states: z.array(z.string()).optional().describe('An array of states to narrow the export to; messages with ANY of the states will be included.'),
    api_keys: z.array(z.string()).optional().describe('An array of API keys to narrow the export to; messages sent with ANY of the keys will be included.'),
    date_from: z.string().optional().describe('Start date as a UTC string in YYYY-MM-DD HH:MM:SS format.'),
    date_to: z.string().optional().describe('End date as a UTC string in YYYY-MM-DD HH:MM:SS format.')
});

const ProviderExportSchema = z.object({
    id: z.string(),
    created_at: z.string(),
    type: z.string(),
    finished_at: z.string().nullable().optional(),
    state: z.string(),
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
    description: "Begin an asynchronous export of the account's activity history.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/exports/
            endpoint: '1.0/exports/activity',
            data: {
                ...(input.notify_email !== undefined && { notify_email: input.notify_email }),
                ...(input.tags !== undefined && { tags: input.tags }),
                ...(input.senders !== undefined && { senders: input.senders }),
                ...(input.states !== undefined && { states: input.states }),
                ...(input.api_keys !== undefined && { api_keys: input.api_keys }),
                ...(input.date_from !== undefined && { date_from: input.date_from }),
                ...(input.date_to !== undefined && { date_to: input.date_to })
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
