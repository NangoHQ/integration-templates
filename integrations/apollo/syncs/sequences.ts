import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Provider schema - matches Apollo API response structure
// https://docs.apollo.io/reference/search-for-sequences
const _ApolloEmailerCampaignSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    active: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    num_steps: z.number().optional(),
    emailer_steps: z.array(z.object({}).passthrough()).optional(),
    unique_scheduled: z.number().optional(),
    unique_delivered: z.number().optional(),
    unique_opened: z.number().optional(),
    unique_replied: z.number().optional(),
    unique_bounced: z.number().optional(),
    user_id: z.string().optional(),
    email_account_id: z.string().optional(),
    label_ids: z.array(z.string()).optional(),
    folder_id: z.string().optional(),
    tags: z.array(z.string()).optional(),
    archived: z.boolean().optional(),
    scheduling_status: z.string().optional(),
    pause_on_out_of_office: z.boolean().optional(),
    pause_on_holiday: z.boolean().optional()
});

// Normalized Sequence model
const SequenceSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    active: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    num_steps: z.number().optional(),
    unique_scheduled: z.number().optional(),
    unique_delivered: z.number().optional(),
    unique_opened: z.number().optional(),
    unique_replied: z.number().optional(),
    unique_bounced: z.number().optional(),
    user_id: z.string().optional(),
    email_account_id: z.string().optional(),
    label_ids: z.array(z.string()).optional(),
    folder_id: z.string().optional(),
    tags: z.array(z.string()).optional(),
    archived: z.boolean().optional(),
    scheduling_status: z.string().optional(),
    pause_on_out_of_office: z.boolean().optional(),
    pause_on_holiday: z.boolean().optional()
});

type ApolloEmailerCampaign = z.infer<typeof _ApolloEmailerCampaignSchema>;

const sync = createSync({
    description: 'Sync sequences from Apollo.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    // https://docs.apollo.io/reference/search-for-sequences
    endpoints: [
        {
            path: '/syncs/sequences',
            method: 'POST'
        }
    ],
    models: {
        Sequence: SequenceSchema
    },

    exec: async (nango) => {
        // Apollo sequence search supports page-based pagination but does not expose a
        // changed-since filter or cursor we can use for incremental syncs.
        await nango.trackDeletesStart('Sequence');

        const proxyConfig: ProxyConfiguration = {
            // https://docs.apollo.io/reference/search-for-sequences
            endpoint: '/v1/emailer_campaigns/search',
            method: 'POST',
            data: {
                pagination: {
                    page: 1,
                    per_page: 100
                }
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'pagination.page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'pagination.per_page',
                limit: 100,
                response_path: 'emailer_campaigns'
            },
            retries: 3
        };

        for await (const campaigns of nango.paginate<ApolloEmailerCampaign>(proxyConfig)) {
            if (campaigns.length === 0) {
                continue;
            }

            const sequences = campaigns.map((campaign) => ({
                id: campaign.id,
                name: campaign.name,
                active: campaign.active,
                created_at: campaign.created_at,
                updated_at: campaign.updated_at,
                num_steps: campaign.num_steps,
                unique_scheduled: campaign.unique_scheduled,
                unique_delivered: campaign.unique_delivered,
                unique_opened: campaign.unique_opened,
                unique_replied: campaign.unique_replied,
                unique_bounced: campaign.unique_bounced,
                user_id: campaign.user_id,
                email_account_id: campaign.email_account_id,
                label_ids: campaign.label_ids,
                folder_id: campaign.folder_id,
                tags: campaign.tags,
                archived: campaign.archived,
                scheduling_status: campaign.scheduling_status,
                pause_on_out_of_office: campaign.pause_on_out_of_office,
                pause_on_holiday: campaign.pause_on_holiday
            }));

            await nango.batchSave(sequences, 'Sequence');
        }

        await nango.trackDeletesEnd('Sequence');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
