import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        ids: z.array(z.string()).optional().describe('Array of lead IDs to move. When provided, either campaign or list_id must also be specified.'),
        list_id: z.string().optional().describe('List ID to filter leads from.'),
        campaign: z.string().optional().describe('Campaign ID to filter leads from.'),
        to_campaign_id: z.string().optional().describe('The ID of the campaign to move the leads to.'),
        to_list_id: z.string().optional().describe('The ID of the list to move the leads to.'),
        search: z.string().optional(),
        filter: z.string().optional(),
        in_campaign: z.boolean().optional(),
        in_list: z.boolean().optional(),
        queries: z.array(z.object({}).passthrough()).optional(),
        excluded_ids: z.array(z.string()).optional(),
        contacts: z.array(z.string()).optional(),
        ignore_resource_filter_clauses: z.boolean().optional(),
        check_duplicates_in_campaigns: z.boolean().optional(),
        skip_leads_in_verification: z.boolean().optional(),
        limit: z.number().optional(),
        assigned_to: z.string().optional(),
        esp_code: z.number().optional(),
        esg_code: z.string().optional(),
        copy_leads: z.boolean().optional(),
        check_duplicates: z.boolean().optional(),
        reset_interest_status: z.boolean().optional(),
        poll_interval_ms: z.number().optional().describe('Polling interval in milliseconds. Default: 2000.'),
        max_poll_attempts: z.number().optional().describe('Maximum number of polling attempts. Default: 30.')
    })
    .passthrough();

const BackgroundJobSchema = z.object({
    id: z.string(),
    workspace_id: z.string(),
    user_id: z.string().nullable().optional(),
    type: z.string(),
    entity_id: z.string().nullable().optional(),
    entity_type: z.string().optional(),
    data: z
        .object({
            moved_lead_emails: z.array(z.string()).optional()
        })
        .passthrough()
        .optional(),
    progress: z.number(),
    status: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = BackgroundJobSchema;

const action = createAction({
    description: 'Move leads to a campaign or list.',
    version: '1.0.0',
    endpoint: { method: 'POST', path: '/actions/move-leads' },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['leads:update', 'leads:all', 'all:update', 'all:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const pollInterval = input.poll_interval_ms ?? 2000;
        const maxPollAttempts = input.max_poll_attempts ?? 30;

        const { poll_interval_ms: _pollInterval, max_poll_attempts: _maxPollAttempts, ...apiPayload } = input;

        // https://developer.instantly.ai/api-reference/lead/move-leads-to-a-campaign-or-list
        const moveResponse = await nango.post({
            endpoint: '/v2/leads/move',
            data: apiPayload,
            retries: 3
        });

        let job = BackgroundJobSchema.parse(moveResponse.data);

        let attempts = 0;
        while (attempts < maxPollAttempts) {
            if (job.status === 'success' || job.status === 'failed') {
                return job;
            }

            attempts += 1;

            await new Promise((resolve) => setTimeout(resolve, pollInterval));

            // https://developer.instantly.ai/api-reference/backgroundjob/get-background-job
            const statusResponse = await nango.get({
                endpoint: `/v2/background-jobs/${encodeURIComponent(job.id)}`,
                retries: 3
            });

            job = BackgroundJobSchema.parse(statusResponse.data);
        }

        return job;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
