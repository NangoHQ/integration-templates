import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    start_date: z.string().describe('Metric report start date (UTC). Format: YYYY-MM-DD. Example: "2026-07-01"'),
    end_date: z.string().describe('Metric report end date (UTC). Format: YYYY-MM-DD. Example: "2026-07-08"'),
    sort_by: z.enum(['ENGAGEMENT', 'SAVE', 'IMPRESSION', 'OUTBOUND_CLICK', 'PIN_CLICK']).describe('Specify sorting order for metrics. Example: "ENGAGEMENT"'),
    metric_types: z
        .array(
            z.enum(['ENGAGEMENT', 'ENGAGEMENT_RATE', 'IMPRESSION', 'OUTBOUND_CLICK', 'OUTBOUND_CLICK_RATE', 'PIN_CLICK', 'PIN_CLICK_RATE', 'SAVE', 'SAVE_RATE'])
        )
        .optional()
        .describe('Metric types to get data for, default is all.'),
    from_claimed_content: z.enum(['OTHER', 'CLAIMED', 'BOTH']).optional().describe('Filter on Pins that match your claimed domain.'),
    pin_format: z
        .enum(['ALL', 'ORGANIC_IMAGE', 'ORGANIC_PRODUCT', 'ORGANIC_VIDEO', 'ADS_STANDARD', 'ADS_PRODUCT', 'ADS_VIDEO', 'ADS_IDEA'])
        .optional()
        .describe('Pin formats to get data for, default is all.'),
    app_types: z.enum(['ALL', 'MOBILE', 'TABLET', 'WEB']).optional().describe('Apps or devices to get data for, default is all.'),
    content_type: z.enum(['ALL', 'PAID', 'ORGANIC']).optional().describe('Filter to paid or organic data. Default is all.'),
    source: z
        .enum(['ALL', 'YOUR_PINS', 'OTHER_PINS'])
        .optional()
        .describe('Filter to activity from Pins created and saved by your, or activity created and saved by others from your claimed accounts'),
    num_of_pins: z.number().int().min(1).max(50).optional().describe('Number of pins to include, default is 10. Max is 50.'),
    created_in_last_n_days: z.literal(30).optional().describe('Get metrics for pins created in the last "n" days. Only supported value is 30.'),
    ad_account_id: z
        .string()
        .optional()
        .describe('Unique identifier of an ad account. Use to specify the owner of that ad account as the "operation user_account".')
});

const TopPinsSortBySchema = z.enum(['ENGAGEMENT', 'SAVE', 'IMPRESSION', 'OUTBOUND_CLICK', 'PIN_CLICK']);

const DataStatusSchema = z.enum([
    'PROCESSING',
    'READY',
    'ESTIMATE',
    'BEFORE_BUSINESS_CREATED',
    'BEFORE_DATA_RETENTION_PERIOD',
    'BEFORE_PIN_DATA_RETENTION_PERIOD',
    'BEFORE_METRIC_START_DATE',
    'BEFORE_CORE_METRIC_START_DATE',
    'BEFORE_PIN_FORMAT_METRIC_START_DATE',
    'BEFORE_AUDIENCE_METRIC_START_DATE',
    'BEFORE_AUDIENCE_MONTHLY_METRIC_START_DATE',
    'BEFORE_VIDEO_METRIC_START_DATE',
    'BEFORE_CONVERSION_METRIC_START_DATE',
    'PURCHASERS_METRIC_SMALLER_THAN_THRESHOLD',
    'IN_BAD_TAG_DATE',
    'BEFORE_PUBLISHED_METRIC_START_DATE',
    'BEFORE_ASSIST_METRIC_START_DATE',
    'BEFORE_PIN_CREATED',
    'BEFORE_ACCOUNT_CLAIMED',
    'BEFORE_DEMOGRAPHIC_FILTERS_START_DATE',
    'AUDIENCE_SEGMENT_SMALLER_THAN_THRESHOLD'
]);

const DateAvailabilitySchema = z.object({
    is_realtime: z.boolean().optional(),
    latest_available_timestamp: z.number().optional()
});

const PinAnalyticsItemSchema = z.object({
    data_status: z.record(z.string(), DataStatusSchema).optional(),
    metrics: z.record(z.string(), z.number()).optional(),
    pin_id: z.string().optional()
});

const OutputSchema = z.object({
    date_availability: DateAvailabilitySchema.optional(),
    pins: z.array(PinAnalyticsItemSchema).optional(),
    sort_by: TopPinsSortBySchema.optional()
});

const action = createAction({
    description: 'Get top-performing organic pins analytics',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pins:read', 'user_accounts:read'],

    exec: async (nango, input) => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#operation/user_account/analytics/top_pins
            endpoint: '/v5/user_account/analytics/top_pins',
            params: {
                start_date: input.start_date,
                end_date: input.end_date,
                sort_by: input.sort_by,
                ...(input.metric_types !== undefined && { metric_types: input.metric_types.join(',') }),
                ...(input.from_claimed_content !== undefined && { from_claimed_content: input.from_claimed_content }),
                ...(input.pin_format !== undefined && { pin_format: input.pin_format }),
                ...(input.app_types !== undefined && { app_types: input.app_types }),
                ...(input.content_type !== undefined && { content_type: input.content_type }),
                ...(input.source !== undefined && { source: input.source }),
                ...(input.num_of_pins !== undefined && { num_of_pins: String(input.num_of_pins) }),
                ...(input.created_in_last_n_days !== undefined && { created_in_last_n_days: String(input.created_in_last_n_days) }),
                ...(input.ad_account_id !== undefined && { ad_account_id: input.ad_account_id })
            },
            retries: 3
        });

        const data = response.data;
        if (!data || typeof data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid or empty response from Pinterest API'
            });
        }

        const parsed = OutputSchema.parse(data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
