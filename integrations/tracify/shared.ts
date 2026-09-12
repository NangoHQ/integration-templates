import { createHash } from 'node:crypto';

import type { ProxyConfiguration } from 'nango';
import * as z from 'zod';

export const metrics = z.enum([
    'visitor_unique_productview',
    'visitor_unique_pageview',
    'visitor_unique_checkout',
    'visitor_unique_addtocart',
    'visitor_unique_login',
    'visitor_productview',
    'visitor_pageview',
    'visitor_checkout',
    'visitor_addtocart',
    'visitor_login',
    'customer_unique_productview',
    'customer_unique_pageview',
    'customer_unique_checkout',
    'customer_unique_addtocart',
    'customer_unique_login',
    'customer_productview',
    'customer_pageview',
    'customer_checkout',
    'customer_addtocart',
    'customer_login',
    'customer_revenue',
    'customer_purchase',
    'customer_num_items',
    'impressions',
    'clicks',
    'link_click',
    'reach',
    'comment',
    'landing_page_view',
    'conversions',
    'all_conversions',
    'onsite_conversion_post_save',
    'video_avg_time_watched_actions',
    'video_view',
    'important_clicks',
    'total_spend',
    'ad_spend',
    'frequency',
    'click_through_rate',
    'cost_per_click',
    'thumbstop_ratio',
    'cost_per_mille',
    'return_on_ad_spend',
    'cost_per_order',
    'average_order_value',
    'conversion_rate',
    'influencer_fixed_commission',
    'influencer_variable_commission',
    'new_customer_purchase_ratio',
    'new_visitor_pageview_ratio',
    'customer_acquisition_cost',
    'discount_code_redemption_rate'
]);

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected an ISO date (YYYY-MM-DD)');
const granularity = z.enum(['daily', 'weekly', 'monthly', 'none']).default('none');
const userType = z.enum(['new', 'returning', 'total']);
export const breakdownDimension = z.enum([
    'campaign',
    'adset',
    'ad',
    'keyword',
    'asset_group',
    'creative',
    'advertising_channel_type',
    'influencer',
    'cooperation',
    'cooperation_link',
    'influencer_channel'
]);
const extraSortField = z.enum([
    'ad_id',
    'keyword_id',
    'asset_group_id',
    'adset_id',
    'campaign_id',
    'ad_name',
    'adset_name',
    'campaign_name',
    'asset_group_name',
    'keyword_text',
    'influencer_id',
    'influencer_name',
    'cooperation_id',
    'cooperation_name',
    'cooperation_link_id',
    'cooperation_link_name',
    'discount_code'
]);

export const kpiQuery = z.object({
    siteIds: z.array(z.string().uuid()).min(1).max(50),
    presetId: z.string().min(1).max(255),
    startDate: date,
    endDate: date,
    granularity,
    requestedMetrics: z.array(metrics).max(100).optional(),
    granularityOnlyMetrics: z.array(metrics).max(100).optional(),
    dailyOnlyMetrics: z.array(metrics).max(100).optional(),
    useSimpleTouchpointWindow: z.boolean().optional()
});

export const pagedKpiQuery = kpiQuery.extend({
    offset: z.number().int().min(0).max(1_000_000).optional(),
    limit: z.number().int().min(0).max(10_000).optional(),
    sortBy: z
        .array(z.union([metrics, extraSortField]))
        .max(20)
        .optional(),
    descending: z.boolean().optional(),
    filterAndSortTarget: userType.optional(),
    filters: z.string().max(20_000).optional()
});

export const channelQuery = kpiQuery.extend({
    channels: z.array(z.string().min(1).max(100)).max(100).optional()
});

export const channelBreakdownQuery = pagedKpiQuery.extend({
    comparisonStartDate: date.optional(),
    comparisonEndDate: date.optional()
});

export const exportQuery = channelBreakdownQuery.extend({
    breakdownDimensions: z.array(breakdownDimension).min(1).max(20),
    exportFormat: z.enum(['csv', 'parquet']).optional()
});

const nvrQueryShape = kpiQuery.omit({ granularityOnlyMetrics: true, dailyOnlyMetrics: true }).extend({
    offset: z.number().int().min(0).max(1_000_000).optional(),
    limit: z.number().int().min(0).max(10_000).optional(),
    sortBy: z
        .array(z.union([metrics, extraSortField]))
        .max(20)
        .optional(),
    descending: z.boolean().optional(),
    filterAndSortTarget: userType.optional(),
    filters: z.string().max(20_000).optional(),
    nvrColumns: z.array(userType).max(3).optional()
});

export const nvrQuery = nvrQueryShape.superRefine((value, ctx) => {
    const days = (Date.parse(value.endDate) - Date.parse(value.startDate)) / 86_400_000;
    if (days < 0 || days > 7) {
        ctx.addIssue({
            code: 'custom',
            path: ['endDate'],
            message: 'NVR time ranges must not exceed 7 days'
        });
    }
});

export const exportStatusQuery = z.object({
    siteIds: z.array(z.string().uuid()).min(1).max(50),
    channel: z.string().min(1).max(100),
    taskId: z.string().min(1).max(255)
});

export type KpiQuery = z.infer<typeof kpiQuery>;
export type NvrQuery = z.infer<typeof nvrQuery>;

const metricBucket = z.record(z.string(), z.number().nullable());
const overviewPeriod = z.object({
    date,
    fixed: metricBucket.nullable().optional(),
    total: metricBucket.nullable().optional(),
    returning: metricBucket.nullable().optional(),
    new: metricBucket.nullable().optional()
});
const overviewOverall = z.object({
    fixed: metricBucket,
    total: metricBucket,
    returning: metricBucket,
    new: metricBucket
});

export const kpiOverviewResponse = z.object({
    overall: overviewOverall,
    daily: z.array(overviewPeriod).nullable().optional(),
    weekly: z.array(overviewPeriod).nullable().optional(),
    monthly: z.array(overviewPeriod).nullable().optional()
});

const kpiChannelResponse = z.object({
    overall: overviewOverall,
    daily: z.array(overviewPeriod).nullable().optional(),
    weekly: z.array(overviewPeriod).nullable().optional(),
    monthly: z.array(overviewPeriod).nullable().optional()
});

export const kpiChannelsResponse = z.object({
    overall: overviewOverall,
    channels: z.record(z.string(), kpiChannelResponse)
});

export const kpiChannelResponseWithName = kpiChannelResponse.extend({
    channel: z.string()
});

const breakdownInfo = z
    .object({
        campaign_id: z.string().nullable().optional(),
        adset_id: z.string().nullable().optional(),
        ad_id: z.string().nullable().optional(),
        campaign_name: z.string().nullable().optional(),
        adset_name: z.string().nullable().optional(),
        ad_name: z.string().nullable().optional(),
        ad_status: z.string().nullable().optional(),
        adset_status: z.string().nullable().optional(),
        campaign_status: z.string().nullable().optional(),
        advertising_channel_type: z.string().nullable().optional(),
        ads_count: z.number().nullable().optional(),
        image: z.string().nullable().optional(),
        video: z.string().nullable().optional(),
        image_url: z.string().nullable().optional(),
        video_url: z.string().nullable().optional(),
        ad_creative_id: z.string().nullable().optional(),
        influencer_id: z.string().nullable().optional(),
        influencer_name: z.string().nullable().optional(),
        cooperation_id: z.string().nullable().optional(),
        cooperation_name: z.string().nullable().optional(),
        placement_type: z.string().nullable().optional(),
        placement_source: z.string().nullable().optional(),
        labels: z.array(z.string()).nullable().optional(),
        cooperation_link_id: z.string().nullable().optional(),
        cooperation_link_title: z.string().nullable().optional(),
        discount_code: z.string().nullable().optional()
    })
    .passthrough();
const pagination = z.object({
    offset: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    has_next_page: z.boolean(),
    detail: z.string()
});
const breakdownItem = z
    .object({
        info: breakdownInfo,
        fixed: metricBucket.nullable().optional(),
        total: metricBucket.nullable().optional(),
        returning: metricBucket.nullable().optional(),
        new: metricBucket.nullable().optional(),
        daily: z.array(overviewPeriod).nullable().optional(),
        weekly: z.array(overviewPeriod).nullable().optional(),
        monthly: z.array(overviewPeriod).nullable().optional()
    })
    .passthrough();
const breakdown = z.object({
    data: z.array(breakdownItem),
    pagination
});
const channelBreakdownResponse = z.object({
    channel: z.string(),
    breakdown_dimension: breakdownDimension,
    overall: overviewOverall,
    breakdown
});
const comparisonBreakdownResponse = z.object({
    main: channelBreakdownResponse,
    comparison: z.object({
        channel: z.string(),
        breakdown_dimension: breakdownDimension,
        overall: overviewOverall,
        breakdown: z.object({ data: z.array(breakdownItem) })
    })
});

export const kpiChannelBreakdownResponse = z.union([channelBreakdownResponse, comparisonBreakdownResponse]);

export const nvrResponse = z.array(
    z
        .object({
            date,
            new_vs_returning: userType,
            channel: z.string()
        })
        .passthrough()
);

export const kpiDiscountCodesResponse = z.object({
    overall: overviewOverall,
    breakdown
});

export const exportStatusResponse = z.object({
    task_id: z.string(),
    status: z.enum(['PENDING', 'STARTED', 'COMPLETED', 'FAILED']).nullable().optional(),
    row_count: z.number().int().nullable().optional(),
    estimated_size_bytes: z.number().int().nullable().optional(),
    download_url: z.string().nullable().optional(),
    detail: z.string()
});

interface NangoProxy {
    proxy(config: ProxyConfiguration): Promise<{ data: unknown }>;
}

interface NangoSync {
    getConnection(): Promise<{ connection_config: Record<string, unknown> }>;
    batchSave(records: object[], model: string): unknown;
    trackDeletesStart(model: string): unknown;
    trackDeletesEnd(model: string): unknown;
    log(message: string): unknown;
}

type QueryValue = string | number | string[] | number[];
type QueryParams = Record<string, QueryValue>;

function append(params: QueryParams, name: string, value: unknown): QueryParams {
    if (value === undefined || value === null) return params;
    if (Array.isArray(value)) {
        return { ...params, [name]: value.map(String) };
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return { ...params, [name]: String(value) };
    }
    return params;
}

export function toParams(input: Record<string, unknown>): QueryParams {
    const parameterValues: [string, unknown][] = [
        ['csids', input['siteIds']],
        ['preset_id', input['presetId']],
        ['start_date', input['startDate']],
        ['end_date', input['endDate']],
        ['granularity', input['granularity']],
        ['requested_metrics', input['requestedMetrics']],
        ['granularity_only_metrics', input['granularityOnlyMetrics']],
        ['daily_only_metrics', input['dailyOnlyMetrics']],
        ['use_simple_touchpoint_window', input['useSimpleTouchpointWindow']],
        ['channels', input['channels']],
        ['offset', input['offset']],
        ['limit', input['limit']],
        ['sort_by', input['sortBy']],
        ['descending', input['descending']],
        ['filter_and_sort_target', input['filterAndSortTarget']],
        ['filters', input['filters']],
        ['comparison_start_date', input['comparisonStartDate']],
        ['comparison_end_date', input['comparisonEndDate']],
        ['nvr_columns', input['nvrColumns']],
        ['breakdown_dimensions', input['breakdownDimensions']],
        ['export_format', input['exportFormat']]
    ];
    return parameterValues.reduce((params, [name, value]) => append(params, name, value), {});
}

export async function getJson(nango: NangoProxy, path: string, input: Record<string, unknown>): Promise<unknown> {
    const response = await nango.proxy({
        // https://tracify.dev/analytics-api/
        endpoint: path,
        method: 'GET',
        params: toParams(input),
        retries: 3
    });
    return response.data;
}

export async function getJsonSync(nango: NangoProxy, path: string, input: Record<string, unknown>): Promise<unknown> {
    const response = await nango.proxy({
        // https://tracify.dev/analytics-api/
        endpoint: path,
        method: 'GET',
        params: toParams(input),
        retries: 10
    });
    return response.data;
}

function dayString(value: Date): string {
    return value.toISOString().slice(0, 10);
}

export async function connectionKpiQuery(nango: NangoSync, windowDays = 30): Promise<KpiQuery> {
    const connection = await nango.getConnection();
    const config = connection['connection_config'];
    const siteId = z.string().uuid().parse(config['siteId']);
    const presetId = z.string().min(1).max(255).parse(config['presetId']);
    const end = new Date();
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - windowDays);
    return kpiQuery.parse({
        siteIds: [siteId],
        presetId,
        startDate: dayString(start),
        endDate: dayString(end),
        granularity: 'daily',
        requestedMetrics: ['customer_revenue', 'customer_purchase', 'customer_num_items']
    });
}

function stableId(endpointName: string, value: unknown, index: number): string {
    const raw = JSON.stringify(value) ?? 'null';
    const digest = createHash('sha256').update(`${endpointName}:${raw}`).digest('hex').slice(0, 24);
    return `${endpointName}:${index}:${digest}`;
}

export async function savePayload(nango: NangoSync, model: string, endpointName: string, payload: unknown): Promise<void> {
    const rows = Array.isArray(payload) ? payload : [payload];
    const records = rows.map((data, index) => ({
        id: stableId(endpointName, data, index),
        endpoint: endpointName,
        fetched_at: new Date().toISOString(),
        data
    }));
    if (records.length > 0) await nango.batchSave(records, model);
    await nango.log(`Saved ${records.length} ${model} record(s)`);
}
