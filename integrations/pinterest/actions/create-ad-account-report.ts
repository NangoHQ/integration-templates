import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    start_date: z.string().describe('Metric report start date (UTC). Format: YYYY-MM-DD. Example: "2026-06-01"'),
    end_date: z.string().describe('Metric report end date (UTC). Format: YYYY-MM-DD. Example: "2026-07-09"'),
    granularity: z.enum(['TOTAL', 'DAY', 'HOUR', 'WEEK', 'MONTH']).describe('Time interval at which analytics data is broken down'),
    level: z
        .enum([
            'ADVERTISER',
            'ADVERTISER_TARGETING',
            'CAMPAIGN',
            'CAMPAIGN_TARGETING',
            'AD_GROUP',
            'AD_GROUP_TARGETING',
            'PIN_PROMOTION',
            'PIN_PROMOTION_TARGETING',
            'KEYWORD',
            'PRODUCT_GROUP',
            'PRODUCT_GROUP_TARGETING',
            'PRODUCT_ITEM',
            'PRODUCT_ITEM_TARGETING'
        ])
        .optional(),
    columns: z.array(z.string()).optional().describe('Metric and entity columns to include in the report'),
    campaign_ids: z.array(z.string()).optional().describe('List of campaign IDs'),
    ad_group_ids: z.array(z.string()).optional().describe('List of ad group IDs'),
    ad_ids: z.array(z.string()).optional().describe('List of ad IDs. Not supported for PRODUCT_ITEM level reports'),
    product_group_ids: z.array(z.string()).optional().describe('List of product group IDs'),
    product_item_ids: z.array(z.string()).optional().describe('List of product item IDs'),
    targeting_types: z
        .array(
            z.enum([
                'KEYWORD',
                'APPTYPE',
                'GENDER',
                'LOCATION',
                'PLACEMENT',
                'COUNTRY',
                'TARGETED_INTEREST',
                'PINNER_INTEREST',
                'AUDIENCE_INCLUDE',
                'GEO',
                'AGE_BUCKET',
                'REGION',
                'MEDIA_TYPE',
                'AGE_BUCKET_AND_GENDER',
                'AUDIENCE_MULTIPLIER',
                'CREATIVE_ENHANCEMENTS',
                'LOCAL_ADS_STORE_CODE'
            ])
        )
        .optional()
        .describe('List of targeting types. Requires level to end with _TARGETING'),
    report_format: z.enum(['JSON', 'CSV']).optional().describe('Format of the generated report. Default: JSON'),
    reporting_timezone: z.enum(['PINTEREST_TIME_ZONE', 'AD_ACCOUNT_TIME_ZONE']).optional().describe('Timezone for the report'),
    click_window_days: z
        .union([z.literal(0), z.literal(1), z.literal(7), z.literal(14), z.literal(30), z.literal(60)])
        .optional()
        .describe('Conversion attribution window for pin click action'),
    engagement_window_days: z
        .union([z.literal(0), z.literal(1), z.literal(7), z.literal(14), z.literal(30), z.literal(60)])
        .optional()
        .describe('Conversion attribution window for engagement action'),
    view_window_days: z
        .union([z.literal(0), z.literal(1), z.literal(7), z.literal(14), z.literal(30), z.literal(60)])
        .optional()
        .describe('Conversion attribution window for view action'),
    conversion_report_time: z.enum(['TIME_OF_AD_ACTION', 'TIME_OF_CONVERSION']).optional().describe('Date dimension for conversion metrics'),
    combine_targeting_types: z.boolean().optional().describe('Consolidate targeting types into a single breakdown'),
    primary_sort: z.enum(['BY_ID', 'BY_DATE']).optional().describe('Sort order for the report'),
    campaign_statuses: z
        .array(z.enum(['RUNNING', 'PAUSED', 'NOT_STARTED', 'COMPLETED', 'ADVERTISER_DISABLED', 'ARCHIVED', 'DRAFT', 'DELETED_DRAFT']))
        .optional()
        .describe('Filter by campaign statuses'),
    ad_group_statuses: z
        .array(z.enum(['RUNNING', 'PAUSED', 'NOT_STARTED', 'COMPLETED', 'ADVERTISER_DISABLED', 'ARCHIVED', 'DRAFT', 'DELETED_DRAFT']))
        .optional()
        .describe('Filter by ad group statuses'),
    ad_statuses: z
        .array(z.enum(['APPROVED', 'PAUSED', 'PENDING', 'REJECTED', 'ADVERTISER_DISABLED', 'ARCHIVED', 'DRAFT', 'DELETED_DRAFT']))
        .optional()
        .describe('Filter by ad statuses'),
    product_group_statuses: z
        .array(z.enum(['RUNNING', 'PAUSED', 'EXCLUDED', 'ARCHIVED']))
        .optional()
        .describe('Filter by product group statuses'),
    campaign_objective_types: z.array(z.string()).optional().describe('Filter by campaign objective types'),
    campaign_brand_label: z.string().optional().describe('Campaign brand label for filtering'),
    campaign_custom_label: z.string().optional().describe('Campaign custom label for filtering'),
    start_hour: z.number().min(0).max(23).optional().describe('Start hour for hourly reports'),
    end_hour: z.number().min(0).max(23).optional().describe('End hour for hourly reports'),
    attribution_types: z
        .array(z.enum(['INDIVIDUAL', 'HOUSEHOLD']))
        .optional()
        .describe('Attribution types for conversion report'),
    metrics_filters: z
        .array(
            z.object({
                field: z.string(),
                operator: z.string(),
                values: z.array(z.number())
            })
        )
        .optional()
        .describe('Metrics filters'),
    custom_conversion_event_metrics: z
        .array(
            z.object({
                custom_event_metrics_type: z.string(),
                custom_event_name: z.string()
            })
        )
        .optional()
        .describe('Custom conversion event metrics')
});

const ProviderCreateResponseSchema = z.object({
    message: z.string().nullable().optional(),
    report_status: z.string(),
    token: z.string()
});

const ProviderGetResponseSchema = z.object({
    report_status: z.string(),
    size: z.number().nullable().optional(),
    url: z.string().nullable().optional()
});

const OutputSchema = z.object({
    token: z.string(),
    report_status: z.string(),
    url: z.string().optional(),
    size: z.number().optional()
});

const MAX_POLL_ATTEMPTS = 30;
const POLL_INTERVAL_MS = 2000;

const action = createAction({
    description: 'Request an async ad account analytics report.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.pinterest.com/docs/api/v5/#operation/analytics/create_report
        const createResponse = await nango.post({
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/reports`,
            data: {
                start_date: input.start_date,
                end_date: input.end_date,
                granularity: input.granularity,
                ...(input.level !== undefined && { level: input.level }),
                ...(input.columns !== undefined && { columns: input.columns }),
                ...(input.campaign_ids !== undefined && { campaign_ids: input.campaign_ids }),
                ...(input.ad_group_ids !== undefined && { ad_group_ids: input.ad_group_ids }),
                ...(input.ad_ids !== undefined && { ad_ids: input.ad_ids }),
                ...(input.product_group_ids !== undefined && { product_group_ids: input.product_group_ids }),
                ...(input.product_item_ids !== undefined && { product_item_ids: input.product_item_ids }),
                ...(input.targeting_types !== undefined && { targeting_types: input.targeting_types }),
                ...(input.report_format !== undefined && { report_format: input.report_format }),
                ...(input.reporting_timezone !== undefined && { reporting_timezone: input.reporting_timezone }),
                ...(input.click_window_days !== undefined && { click_window_days: input.click_window_days }),
                ...(input.engagement_window_days !== undefined && { engagement_window_days: input.engagement_window_days }),
                ...(input.view_window_days !== undefined && { view_window_days: input.view_window_days }),
                ...(input.conversion_report_time !== undefined && { conversion_report_time: input.conversion_report_time }),
                ...(input.combine_targeting_types !== undefined && { combine_targeting_types: input.combine_targeting_types }),
                ...(input.primary_sort !== undefined && { primary_sort: input.primary_sort }),
                ...(input.campaign_statuses !== undefined && { campaign_statuses: input.campaign_statuses }),
                ...(input.ad_group_statuses !== undefined && { ad_group_statuses: input.ad_group_statuses }),
                ...(input.ad_statuses !== undefined && { ad_statuses: input.ad_statuses }),
                ...(input.product_group_statuses !== undefined && { product_group_statuses: input.product_group_statuses }),
                ...(input.campaign_objective_types !== undefined && { campaign_objective_types: input.campaign_objective_types }),
                ...(input.campaign_brand_label !== undefined && { campaign_brand_label: input.campaign_brand_label }),
                ...(input.campaign_custom_label !== undefined && { campaign_custom_label: input.campaign_custom_label }),
                ...(input.start_hour !== undefined && { start_hour: input.start_hour }),
                ...(input.end_hour !== undefined && { end_hour: input.end_hour }),
                ...(input.attribution_types !== undefined && { attribution_types: input.attribution_types }),
                ...(input.metrics_filters !== undefined && { metrics_filters: input.metrics_filters }),
                ...(input.custom_conversion_event_metrics !== undefined && { custom_conversion_event_metrics: input.custom_conversion_event_metrics })
            },
            retries: 3
        });

        const created = ProviderCreateResponseSchema.parse(createResponse.data);

        let pollResult: z.infer<typeof ProviderGetResponseSchema> | null = null;

        for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
            // https://developers.pinterest.com/docs/api/v5/#operation/analytics/get_report
            const pollResponse = await nango.get({
                endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/reports`,
                params: {
                    token: created.token
                },
                retries: 3
            });

            const pollData = ProviderGetResponseSchema.parse(pollResponse.data);
            pollResult = pollData;

            if (pollData.report_status === 'FINISHED') {
                break;
            }

            if (['FAILED', 'CANCELLED', 'EXPIRED', 'DOES_NOT_EXIST'].includes(pollData.report_status)) {
                throw new nango.ActionError({
                    type: 'report_failed',
                    message: `Report ended with terminal status: ${pollData.report_status}`,
                    token: created.token,
                    report_status: pollData.report_status
                });
            }

            await new Promise((resolve) => {
                setTimeout(resolve, POLL_INTERVAL_MS);
            });
        }

        if (!pollResult || pollResult.report_status !== 'FINISHED') {
            throw new nango.ActionError({
                type: 'report_timeout',
                message: 'Report did not finish within the polling timeout',
                token: created.token,
                report_status: pollResult?.report_status ?? null
            });
        }

        return {
            token: created.token,
            report_status: pollResult.report_status,
            ...(pollResult.url != null && { url: pollResult.url }),
            ...(pollResult.size != null && { size: pollResult.size })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
