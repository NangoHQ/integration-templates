import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CampaignSchema = z.object({
    id: z.string(),
    name: z.string().nullish(),
    status: z.number(),
    timestamp_created: z.string(),
    timestamp_updated: z.string(),
    is_evergreen: z.boolean().nullish(),
    pl_value: z.number().nullish(),
    email_gap: z.number().nullish(),
    random_wait_max: z.number().nullish(),
    text_only: z.boolean().nullish(),
    first_email_text_only: z.boolean().nullish(),
    daily_limit: z.number().nullish(),
    stop_on_reply: z.boolean().nullish(),
    link_tracking: z.boolean().nullish(),
    open_tracking: z.boolean().nullish(),
    stop_on_auto_reply: z.boolean().nullish(),
    daily_max_leads: z.number().nullish(),
    prioritize_new_leads: z.boolean().nullish(),
    match_lead_esp: z.boolean().nullish(),
    stop_for_company: z.boolean().nullish(),
    insert_unsubscribe_header: z.boolean().nullish(),
    allow_risky_contacts: z.boolean().nullish(),
    disable_bounce_protect: z.boolean().nullish(),
    not_sending_status: z.number().nullish(),
    owned_by: z.string().nullish(),
    organization: z.string().nullish(),
    ai_sdr_id: z.string().nullish(),
    email_list: z.array(z.string()).nullish(),
    email_tag_list: z.array(z.string()).nullish(),
    cc_list: z.array(z.string()).nullish(),
    bcc_list: z.array(z.string()).nullish(),
    campaign_schedule: z.record(z.string(), z.unknown()).nullish(),
    sequences: z.array(z.record(z.string(), z.unknown())).nullish(),
    core_variables: z.record(z.string(), z.unknown()).nullish(),
    custom_variables: z.record(z.string(), z.unknown()).nullish(),
    auto_variant_select: z.record(z.string(), z.unknown()).nullish(),
    limit_emails_per_company_override: z.record(z.string(), z.unknown()).nullish(),
    provider_routing_rules: z.array(z.record(z.string(), z.unknown())).nullish()
});

const CheckpointSchema = z.object({
    starting_after: z.string()
});

const sync = createSync({
    description: 'Sync campaigns.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Campaign: CampaignSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let nextCursor: string | undefined = checkpoint?.starting_after;

        const proxyConfig: ProxyConfiguration = {
            // https://developer.instantly.ai/api-reference/groups/campaign
            endpoint: '/v2/campaigns',
            params: {
                ...(nextCursor && { starting_after: nextCursor })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'starting_after',
                cursor_path_in_response: 'next_starting_after',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam }: { nextPageParam?: string | number | undefined }) => {
                    nextCursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const items: unknown[] = page;
            const campaigns: Array<z.infer<typeof CampaignSchema>> = [];
            for (const raw of items) {
                const parsed = CampaignSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse campaign: ${parsed.error.message}`);
                }
                campaigns.push(parsed.data);
            }

            if (campaigns.length > 0) {
                await nango.batchSave(campaigns, 'Campaign');
            }

            if (nextCursor !== undefined) {
                await nango.saveCheckpoint({ starting_after: nextCursor });
            }
        }

        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
