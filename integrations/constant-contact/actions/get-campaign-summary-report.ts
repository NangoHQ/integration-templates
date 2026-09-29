import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        limit: z
            .number()
            .int()
            .min(1)
            .max(500)
            .optional()
            .describe(
                'Maximum number of campaign summaries to return in a single page of results. Defaults to 50 when omitted; the provider maximum is 500. Example: 100.'
            ),
        cursor: z.string().optional().describe('Pagination cursor from the next_cursor field of a previous response. Omit to fetch the first page of results.')
    })
    .describe('Input for the account-wide email campaign summary report.');

const UniqueCountsSchema = z
    .object({
        sends: z.number().optional().describe('Total number of unique contacts the campaign was sent to.'),
        opens: z.number().optional().describe('Total number of unique contacts who opened the campaign.'),
        clicks: z.number().optional().describe('Total number of unique contacts who clicked a link in the campaign.'),
        forwards: z.number().optional().describe('Total number of unique contacts who forwarded the campaign.'),
        optouts: z.number().optional().describe('Total number of unique contacts who unsubscribed through the campaign.'),
        abuse: z.number().optional().describe('Total number of unique contacts who reported the campaign as abuse (spam).'),
        bounces: z.number().optional().describe('Total number of unique contacts for whom delivery of the campaign bounced.'),
        not_opened: z.number().optional().describe('Total number of unique contacts who were sent the campaign but did not open it.')
    })
    .describe('Unique per-contact interaction counts for the campaign.');

const CampaignSummarySchema = z
    .object({
        campaign_id: z.string().describe('The ID that uniquely identifies the email campaign. Example: "43ee2c37-c8f8-4974-9560-ef93ad51d58b".'),
        campaign_type: z.string().optional().describe('The email campaign type. Example: "Newsletter".'),
        last_sent_date: z.string().optional().describe('ISO-8601 timestamp of when the campaign was last sent. Example: "2022-04-25T11:08:00.000Z".'),
        unique_counts: UniqueCountsSchema.optional().describe('Unique per-contact interaction counts for the campaign. Omitted when no tracking data exists.')
    })
    .describe('Performance summary for a single email campaign.');

const AggregatePercentsSchema = z
    .object({
        click: z.number().optional().describe('Aggregate click rate, in percent, across the campaigns on this page.'),
        open: z.number().optional().describe('Aggregate open rate, in percent, across the campaigns on this page.'),
        did_not_open: z.number().optional().describe('Aggregate did-not-open rate, in percent, across the campaigns on this page.'),
        bounce: z.number().optional().describe('Aggregate bounce rate, in percent, across the campaigns on this page.'),
        unsubscribe: z.number().optional().describe('Aggregate unsubscribe (opt-out) rate, in percent, across the campaigns on this page.')
    })
    .describe('Aggregate percentage rates across all campaigns included in this page of results.');

const OutputSchema = z
    .object({
        bulk_email_campaign_summaries: z
            .array(CampaignSummarySchema)
            .describe('Per-campaign performance summaries, sorted with the most recently sent campaign first.'),
        aggregate_percents: AggregatePercentsSchema.optional().describe(
            'Aggregate percentage rates across the campaigns on this page. Omitted when the provider does not return them.'
        ),
        next_cursor: z.string().optional().describe('Pagination cursor for the next page of results. Omitted when there are no more pages.')
    })
    .describe('Account-wide aggregate email campaign summary report.');

const ProviderResponseSchema = z.object({
    bulk_email_campaign_summaries: z.array(CampaignSummarySchema).optional(),
    aggregate_percents: AggregatePercentsSchema.optional(),
    _links: z
        .object({
            next: z
                .object({
                    href: z.string()
                })
                .optional()
        })
        .optional()
});

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only GET of account-wide email campaign performance statistics and mutates nothing on the provider.
 * @pitfalls: Only sent campaigns with primary_email or resend role activities are included, so draft or never-sent campaigns never appear in the report. aggregate_percents covers only the campaigns on the returned page, not every campaign on the account.
 */
const action = createAction({
    description: 'Get account-wide aggregate email campaign performance (opens/clicks/bounces/unsubscribes).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['campaign_data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.constantcontact.com/api_guide/email_bulk_campaign_summary_report.html
            endpoint: '/v3/reports/summary_reports/email_campaign_summaries',
            params: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.cursor !== undefined && { next: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const parsed = ProviderResponseSchema.parse(response.data ?? {});

        const nextHref = parsed._links?.next?.href;
        const nextCursorMatch = nextHref ? /[?&]next=([^&]+)/.exec(nextHref) : null;
        const nextCursor = nextCursorMatch?.[1];

        return {
            bulk_email_campaign_summaries: parsed.bulk_email_campaign_summaries ?? [],
            ...(parsed.aggregate_percents && { aggregate_percents: parsed.aggregate_percents }),
            ...(nextCursor && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
