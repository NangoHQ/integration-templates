import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    start_date: z.string().describe('Metric report start date (UTC). Format: YYYY-MM-DD. Cannot be more than 90 days back from today. Example: "2024-01-01"'),
    end_date: z.string().describe('Metric report end date (UTC). Format: YYYY-MM-DD. Cannot be more than 90 days past start_date. Example: "2024-01-31"'),
    sort_by: z
        .enum([
            'SAVE',
            'IMPRESSION',
            'OUTBOUND_CLICK',
            'VIDEO_MRC_VIEW',
            'VIDEO_AVG_WATCH_TIME',
            'VIDEO_V50_WATCH_TIME',
            'QUARTILE_95_PERCENT_VIEW',
            'VIDEO_10S_VIEW',
            'VIDEO_START'
        ])
        .describe('Specify sorting order for video metrics. Example: "IMPRESSION"'),
    metric_types: z
        .array(
            z.enum([
                'IMPRESSION',
                'SAVE',
                'VIDEO_MRC_VIEW',
                'VIDEO_AVG_WATCH_TIME',
                'VIDEO_V50_WATCH_TIME',
                'QUARTILE_95_PERCENT_VIEW',
                'VIDEO_10S_VIEW',
                'VIDEO_START',
                'OUTBOUND_CLICK'
            ])
        )
        .optional()
        .describe('Metric types to get video data for. Example: ["IMPRESSION", "VIDEO_START"]'),
    from_claimed_content: z.enum(['OTHER', 'CLAIMED', 'BOTH']).optional().describe('Filter on Pins that match your claimed domain. Default: BOTH'),
    pin_format: z
        .enum(['ALL', 'ORGANIC_IMAGE', 'ORGANIC_PRODUCT', 'ORGANIC_VIDEO', 'ADS_STANDARD', 'ADS_PRODUCT', 'ADS_VIDEO', 'ADS_IDEA'])
        .optional()
        .describe('Pin formats to get data for. Default: ALL'),
    app_types: z.enum(['ALL', 'MOBILE', 'TABLET', 'WEB']).optional().describe('Apps or devices to get data for. Default: ALL'),
    content_type: z.enum(['ALL', 'PAID', 'ORGANIC']).optional().describe('Filter to paid or organic data. Default: ALL'),
    source: z
        .enum(['ALL', 'YOUR_PINS', 'OTHER_PINS'])
        .optional()
        .describe('Filter to activity from Pins created and saved by you, or activity created and saved by others from your claimed accounts. Default: ALL'),
    num_of_pins: z.number().int().min(1).max(50).optional().describe('Number of pins to include. Default: 10. Max: 50.'),
    created_in_last_n_days: z.literal(30).optional().describe('Get metrics for pins created in the last 30 days.'),
    ad_account_id: z
        .string()
        .optional()
        .describe(
            'Unique identifier of an ad account. Used for Business Access to specify the owner of that ad account as the operation user_account. Example: "549770573673"'
        )
});

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

const ProviderResponseSchema = z.object({
    date_availability: z
        .object({
            is_realtime: z.boolean().optional(),
            latest_available_timestamp: z.number().optional()
        })
        .optional(),
    pins: z
        .array(
            z.object({
                data_status: z.record(z.string(), DataStatusSchema).optional(),
                metrics: z.record(z.string(), z.number()).optional(),
                pin_id: z.string().optional()
            })
        )
        .optional(),
    sort_by: z.string().optional()
});

const OutputSchema = z.object({
    date_availability: z
        .object({
            is_realtime: z.boolean().optional(),
            latest_available_timestamp: z.number().optional()
        })
        .optional(),
    pins: z
        .array(
            z.object({
                data_status: z.record(z.string(), DataStatusSchema).optional(),
                metrics: z.record(z.string(), z.number()).optional(),
                pin_id: z.string().optional()
            })
        )
        .optional(),
    sort_by: z.string().optional()
});

const action = createAction({
    description: 'Get top-performing organic video pins analytics.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pins:read', 'user_accounts:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#operation/user_account/analytics/top_video_pins
            endpoint: '/v5/user_account/analytics/top_video_pins',
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

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            ...(providerResponse.date_availability !== undefined && { date_availability: providerResponse.date_availability }),
            ...(providerResponse.pins !== undefined && { pins: providerResponse.pins }),
            ...(providerResponse.sort_by !== undefined && { sort_by: providerResponse.sort_by })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
