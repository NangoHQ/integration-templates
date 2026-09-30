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
            .describe('Maximum number of campaigns to return per page, between 1 and 500. Provider default: 50. Example: 100'),
        updated_after: z
            .string()
            .optional()
            .describe(
                'ISO-8601 timestamp; return campaigns whose updated_at is after this date/time. Example: "2026-01-01T00:00:00Z". Sent to the provider as after_date.'
            ),
        updated_before: z
            .string()
            .optional()
            .describe(
                'ISO-8601 timestamp; return campaigns whose updated_at is before this date/time. Example: "2026-12-31T23:59:59Z". Sent to the provider as before_date.'
            ),
        cursor: z.string().optional().describe('Pagination cursor from the previous response next_cursor field. Omit for the first page.')
    })
    .describe('Optional filters and pagination for listing email campaigns.');

const ProviderCampaignSchema = z.object({
    campaign_id: z.string(),
    created_at: z.string(),
    current_status: z.string(),
    name: z.string(),
    type: z.string(),
    type_code: z.number(),
    updated_at: z.string()
});

const ProviderListResponseSchema = z.object({
    campaigns: z.array(ProviderCampaignSchema),
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

const CampaignSchema = z.object({
    campaign_id: z.string().describe('Unique identifier of the email campaign. Example: "123e4567-e89b-12d3-a456-426614174000"'),
    created_at: z.string().describe('ISO-8601 timestamp when the campaign was created. Example: "2026-09-29T14:34:37.000Z"'),
    current_status: z.string().describe('Current status of the campaign as returned by the provider, e.g. "Draft", "Scheduled" or "Sent".'),
    name: z.string().describe('Name of the campaign.'),
    type: z.string().describe('Type of the campaign, e.g. "NEWSLETTER" or "CUSTOM_CODE_EMAIL".'),
    type_code: z.number().describe('Numeric code corresponding to the campaign type. Example: 10'),
    updated_at: z.string().describe('ISO-8601 timestamp when the campaign was last updated. Example: "2026-09-29T14:34:37.000Z"')
});

const OutputSchema = z
    .object({
        campaigns: z.array(CampaignSchema).describe('The page of email campaigns matching the request.'),
        next_cursor: z.string().optional().describe('Cursor to pass as the cursor input to fetch the next page. Omitted when there are no more pages.')
    })
    .describe('A page of email campaigns.');

/**
 * @tags: [read]
 * @tagReason: Performs a read-only GET request that lists email campaigns without mutating any provider data.
 * @pitfalls: The provider only supports filtering email campaigns by updated_at (via after_date/before_date); there is no status or created_at filter, so filtering by status must be done client-side. Returned current_status values use mixed-case provider casing (e.g. "Draft").
 */
const action = createAction({
    description: 'List email campaigns.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['campaign_data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://v3.developer.constantcontact.com/api_guide/email_campaigns_collection.html
            endpoint: '/v3/emails',
            params: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.updated_after !== undefined && { after_date: input.updated_after }),
                ...(input.updated_before !== undefined && { before_date: input.updated_before }),
                ...(input.cursor !== undefined && { next: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get(config);
        const parsed = ProviderListResponseSchema.parse(response.data);

        let next_cursor: string | undefined;
        const nextHref = parsed._links?.next?.href;
        if (nextHref) {
            const queryIndex = nextHref.indexOf('?');
            if (queryIndex !== -1) {
                const nextParam = new URLSearchParams(nextHref.slice(queryIndex + 1)).get('next');
                if (nextParam) {
                    next_cursor = nextParam;
                }
            }
        }

        return {
            campaigns: parsed.campaigns,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
