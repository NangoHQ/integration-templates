import { z } from 'zod';
import { createAction } from 'nango';

const FilterSchema = z.object({
    field_name: z.string().optional().describe('Filter field name. Example: "campaign_id"'),
    filter_type: z.string().optional().describe('Filter type. Example: "IN", "MATCH", "GREATER_EQUAL"'),
    filter_value: z.string().optional().describe('The value to filter. When filter_type is IN, filter_value needs to be a valid JSON array character string.')
});

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    report_type: z.string().describe('Report type. Example: "BASIC"'),
    data_level: z.string().optional().describe('Data level. Example: "AUCTION_CAMPAIGN", "AUCTION_ADGROUP", "AUCTION_AD"'),
    dimensions: z.array(z.string()).optional().describe('Dimensions to group by. Example: ["campaign_id", "stat_time_day"]'),
    metrics: z.array(z.string()).optional().describe('Metrics to retrieve. Example: ["spend", "impressions", "clicks"]'),
    start_date: z.string().optional().describe('Start date in YYYY-MM-DD format. Example: "2024-01-01"'),
    end_date: z.string().optional().describe('End date in YYYY-MM-DD format. Example: "2024-01-31"'),
    filtering: z.array(FilterSchema).optional().describe('Filters to apply.'),
    page: z.number().optional().describe('Page number. Default: 1'),
    page_size: z.number().optional().describe('Page size. Default: 10'),
    order_field: z.string().optional().describe('Field to order by.'),
    order_type: z.string().optional().describe('Order type. Example: "ASC", "DESC"'),
    query_lifetime: z.boolean().optional().describe('Query lifetime data.'),
    enable_total_metrics: z.boolean().optional().describe('Enable total metrics.')
});

const PageInfoSchema = z.object({
    page: z.number().optional(),
    page_size: z.number().optional(),
    total_number: z.number().optional(),
    total_page: z.number().optional()
});

const ReportListItemSchema = z.object({
    dimensions: z.record(z.string(), z.unknown()).optional(),
    metrics: z.record(z.string(), z.unknown()).optional()
});

const ReportDataSchema = z.object({
    list: z.array(ReportListItemSchema).optional(),
    page_info: PageInfoSchema.optional()
});

const ProviderResponseSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    request_id: z.string().optional(),
    data: ReportDataSchema.optional()
});

const OutputSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    request_id: z.string().optional(),
    data: ReportDataSchema.optional()
});

const action = createAction({
    description: 'Run a TikTok Ads integrated report.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/run-integrated-report',
        group: 'Reports'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://business-api.tiktok.com/portal/docs?id=1740302848100353
            endpoint: '/report/integrated/get/',
            params: {
                advertiser_id: input.advertiser_id,
                report_type: input.report_type,
                ...(input.data_level !== undefined && { data_level: input.data_level }),
                ...(input.dimensions !== undefined && { dimensions: JSON.stringify(input.dimensions) }),
                ...(input.metrics !== undefined && { metrics: JSON.stringify(input.metrics) }),
                ...(input.start_date !== undefined && { start_date: input.start_date }),
                ...(input.end_date !== undefined && { end_date: input.end_date }),
                ...(input.filtering !== undefined && { filtering: JSON.stringify(input.filtering) }),
                ...(input.page !== undefined && { page: String(input.page) }),
                ...(input.page_size !== undefined && { page_size: String(input.page_size) }),
                ...(input.order_field !== undefined && { order_field: input.order_field }),
                ...(input.order_type !== undefined && { order_type: input.order_type }),
                ...(input.query_lifetime !== undefined && { query_lifetime: String(input.query_lifetime) }),
                ...(input.enable_total_metrics !== undefined && { enable_total_metrics: String(input.enable_total_metrics) })
            },
            baseUrlOverride: 'https://sandbox-ads.tiktok.com/open_api/v1.3/',
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            ...(providerResponse.code !== undefined && { code: providerResponse.code }),
            ...(providerResponse.message !== undefined && { message: providerResponse.message }),
            ...(providerResponse.request_id !== undefined && { request_id: providerResponse.request_id }),
            ...(providerResponse.data !== undefined && {
                data: {
                    ...(providerResponse.data.list !== undefined && { list: providerResponse.data.list }),
                    ...(providerResponse.data.page_info !== undefined && {
                        page_info: {
                            ...(providerResponse.data.page_info.page !== undefined && { page: providerResponse.data.page_info.page }),
                            ...(providerResponse.data.page_info.page_size !== undefined && { page_size: providerResponse.data.page_info.page_size }),
                            ...(providerResponse.data.page_info.total_number !== undefined && { total_number: providerResponse.data.page_info.total_number }),
                            ...(providerResponse.data.page_info.total_page !== undefined && { total_page: providerResponse.data.page_info.total_page })
                        }
                    })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
