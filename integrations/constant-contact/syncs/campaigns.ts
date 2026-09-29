import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

/**
 * Public model synced by this script.
 */
const CampaignSchema = z
    .object({
        id: z.string().describe('Unique Constant Contact campaign ID (campaign_id). Example: "ff5368e0-2da3-4b2e-a234-a5371795df96".'),
        name: z.string().optional().describe('Internal name of the campaign as set in Constant Contact.'),
        current_status: z.string().optional().describe('Campaign-level status reported by Constant Contact, e.g. "DRAFT", "SCHEDULED" or "SENT".'),
        type: z.string().optional().describe('Campaign type, e.g. "NEWSLETTER" or "CUSTOM_CODE_EMAIL".'),
        type_code: z.number().optional().describe('Numeric Constant Contact campaign type code, e.g. 10 for NEWSLETTER or 26 for CUSTOM_CODE_EMAIL.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp of when the campaign was created. Example: "2026-09-29T14:34:37.000Z".'),
        updated_at: z.string().optional().describe('ISO 8601 timestamp of when the campaign was last updated. Example: "2026-09-29T14:34:37.000Z".'),
        campaign_activity_id: z
            .string()
            .optional()
            .describe('ID of the campaign activity with role "primary_email", which holds the email content metadata for the campaign.'),
        subject: z.string().optional().describe('Email subject line from the primary_email campaign activity.'),
        preheader: z.string().optional().describe('Email preheader (preview text) from the primary_email campaign activity, when one is set.'),
        from_email: z.string().optional().describe('Sender email address of the primary_email campaign activity. Example: "api@nango.dev".'),
        from_name: z.string().optional().describe('Sender display name of the primary_email campaign activity.'),
        reply_to_email: z.string().optional().describe('Reply-to email address of the primary_email campaign activity.'),
        contact_list_ids: z.array(z.string()).optional().describe('IDs of the Constant Contact lists the primary_email campaign activity is addressed to.'),
        activity_status: z.string().optional().describe('Status of the primary_email campaign activity, e.g. "DRAFT" or "SCHEDULED".')
    })
    .describe(
        'Constant Contact email campaign enriched with metadata (subject, preheader, from/reply-to, contact lists, status) from its primary_email campaign activity.'
    );

/**
 * Internal schemas used only to parse Constant Contact API responses.
 */
const CampaignListItemSchema = z.object({
    campaign_id: z.string(),
    name: z.string().optional(),
    current_status: z.string().optional(),
    type: z.string().optional(),
    type_code: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const CampaignActivityRefSchema = z.object({
    campaign_activity_id: z.string(),
    role: z.string()
});

const CampaignDetailSchema = CampaignListItemSchema.extend({
    campaign_activities: z.array(CampaignActivityRefSchema).optional()
});

const CampaignActivitySchema = z.object({
    campaign_activity_id: z.string(),
    campaign_id: z.string().optional(),
    role: z.string().optional(),
    current_status: z.string().optional(),
    format_type: z.number().optional(),
    from_email: z.string().optional(),
    from_name: z.string().optional(),
    reply_to_email: z.string().optional(),
    subject: z.string().optional(),
    preheader: z.string().optional(),
    contact_list_ids: z.array(z.string()).optional(),
    segment_ids: z.array(z.string()).optional(),
    document_id: z.string().optional()
});

const HttpErrorSchema = z.object({
    response: z.object({ status: z.number() }).optional()
});

function isNotFoundError(error: unknown): boolean {
    const parsed = HttpErrorSchema.safeParse(error);
    return parsed.success && parsed.data.response?.status === 404;
}

const CheckpointSchema = z.object({
    next_page_path: z
        .string()
        .describe('Provider-supplied next page path from `_links.next.href`; used to resume an in-progress full refresh without restarting from page 1.')
});

function normalizeNextPagePath(nextPageParam: string | undefined): string | undefined {
    const trimmed = nextPageParam?.trim();
    if (!trimmed) {
        return undefined;
    }

    try {
        const url = new URL(trimmed);
        return `${url.pathname}${url.search}`;
    } catch {
        return trimmed;
    }
}

const sync = createSync({
    description: 'Sync Constant Contact email campaigns and their activity metadata (subject, from/reply-to, status).',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Campaign: CampaignSchema
    },

    exec: async (nango) => {
        // Full refresh blocker: `updated_after` on GET /v3/emails is silently ignored,
        // and no changed-records or deleted-records feed exists. Resume state is only
        // the provider's `_links.next.href` pagination link, which we persist so an
        // interrupted delete-tracked crawl can continue instead of restarting at page 1.
        const rawCheckpoint: unknown = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint);
        const checkpoint = parsedCheckpoint.success ? parsedCheckpoint.data : undefined;
        let nextPagePath = normalizeNextPagePath(checkpoint?.next_page_path);

        await nango.trackDeletesStart('Campaign');

        const listConfig: ProxyConfiguration = {
            // https://v3.developer.constantcontact.com/api_reference/index.html
            endpoint: nextPagePath ?? '/v3/emails',
            paginate: {
                type: 'link',
                link_path_in_response_body: '_links.next.href',
                response_path: 'campaigns',
                limit_name_in_request: 'limit',
                limit: 50,
                on_page: async ({ nextPageParam }) => {
                    nextPagePath = normalizeNextPagePath(typeof nextPageParam === 'string' ? nextPageParam : undefined);
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate<unknown>(listConfig)) {
            const campaigns: Array<z.infer<typeof CampaignSchema>> = [];

            for (const raw of page) {
                const listItem = CampaignListItemSchema.parse(raw);

                // @allowTryCatch: the campaigns list can reference campaigns that were
                // concurrently deleted; a 404 on the detail or activity fetch means the
                // campaign is gone, so it is skipped and trackDeletesEnd removes it.
                // Any other error is rethrown so the run fails instead of falsely
                // reporting records as deleted.
                try {
                    // https://v3.developer.constantcontact.com/api_reference/index.html
                    const detailResponse = await nango.get({
                        endpoint: `/v3/emails/${encodeURIComponent(listItem.campaign_id)}`,
                        retries: 3
                    });
                    const detail = CampaignDetailSchema.parse(detailResponse.data);

                    const primaryActivity = detail.campaign_activities?.find((activity) => activity.role === 'primary_email');

                    let activity: z.infer<typeof CampaignActivitySchema> | undefined;
                    if (primaryActivity) {
                        // https://v3.developer.constantcontact.com/api_reference/index.html
                        const activityResponse = await nango.get({
                            endpoint: `/v3/emails/activities/${encodeURIComponent(primaryActivity.campaign_activity_id)}`,
                            retries: 3
                        });
                        activity = CampaignActivitySchema.parse(activityResponse.data);
                    }

                    campaigns.push({
                        id: detail.campaign_id,
                        ...(detail.name !== undefined && { name: detail.name }),
                        ...(detail.current_status !== undefined && { current_status: detail.current_status }),
                        ...(detail.type !== undefined && { type: detail.type }),
                        ...(detail.type_code !== undefined && { type_code: detail.type_code }),
                        ...(detail.created_at !== undefined && { created_at: detail.created_at }),
                        ...(detail.updated_at !== undefined && { updated_at: detail.updated_at }),
                        ...(activity && {
                            campaign_activity_id: activity.campaign_activity_id,
                            ...(activity.current_status !== undefined && { activity_status: activity.current_status }),
                            ...(activity.subject !== undefined && { subject: activity.subject }),
                            ...(activity.preheader !== undefined && { preheader: activity.preheader }),
                            ...(activity.from_email !== undefined && { from_email: activity.from_email }),
                            ...(activity.from_name !== undefined && { from_name: activity.from_name }),
                            ...(activity.reply_to_email !== undefined && { reply_to_email: activity.reply_to_email }),
                            ...(activity.contact_list_ids !== undefined && { contact_list_ids: activity.contact_list_ids })
                        })
                    });
                } catch (error) {
                    if (isNotFoundError(error)) {
                        continue;
                    }
                    throw error;
                }
            }

            if (campaigns.length > 0) {
                await nango.batchSave(campaigns, 'Campaign');
            }

            if (nextPagePath) {
                await nango.saveCheckpoint({ next_page_path: nextPagePath });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Campaign');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
