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

export function toParams(input: Record<string, unknown>): string {
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
    const params = new URLSearchParams();
    for (const [name, value] of parameterValues) {
        if (value === undefined || value === null) continue;
        if (Array.isArray(value)) {
            for (const item of value) params.append(name, String(item));
        } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            params.append(name, String(value));
        }
    }
    return params.toString();
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

const sha256Constants = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74,
    0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d,
    0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e,
    0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
    0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

function rotateRight(value: number, bits: number): number {
    return (value >>> bits) | (value << (32 - bits));
}

function sha256(value: string): string {
    const input = new TextEncoder().encode(value);
    const paddedLength = Math.ceil((input.length + 9) / 64) * 64;
    const padded = new Uint8Array(paddedLength);
    padded.set(input);
    padded[input.length] = 0x80;
    const view = new DataView(padded.buffer);
    const bitLength = input.length * 8;
    view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));
    view.setUint32(paddedLength - 4, bitLength >>> 0);

    let h0 = 0x6a09e667;
    let h1 = 0xbb67ae85;
    let h2 = 0x3c6ef372;
    let h3 = 0xa54ff53a;
    let h4 = 0x510e527f;
    let h5 = 0x9b05688c;
    let h6 = 0x1f83d9ab;
    let h7 = 0x5be0cd19;
    const words = new Uint32Array(64);

    for (let offset = 0; offset < padded.length; offset += 64) {
        for (let index = 0; index < 16; index += 1) {
            words[index] = view.getUint32(offset + index * 4);
        }
        for (let index = 16; index < 64; index += 1) {
            const previous = words[index - 15]!;
            const secondPrevious = words[index - 2]!;
            const smallSigma0 = rotateRight(previous, 7) ^ rotateRight(previous, 18) ^ (previous >>> 3);
            const smallSigma1 = rotateRight(secondPrevious, 17) ^ rotateRight(secondPrevious, 19) ^ (secondPrevious >>> 10);
            words[index] = (words[index - 16]! + smallSigma0 + words[index - 7]! + smallSigma1) >>> 0;
        }

        let a = h0;
        let b = h1;
        let c = h2;
        let d = h3;
        let e = h4;
        let f = h5;
        let g = h6;
        let h = h7;

        for (let index = 0; index < 64; index += 1) {
            const bigSigma1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
            const choose = (e & f) ^ (~e & g);
            const temporary1 = (h + bigSigma1 + choose + sha256Constants[index]! + words[index]!) >>> 0;
            const bigSigma0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
            const majority = (a & b) ^ (a & c) ^ (b & c);
            const temporary2 = (bigSigma0 + majority) >>> 0;
            h = g;
            g = f;
            f = e;
            e = (d + temporary1) >>> 0;
            d = c;
            c = b;
            b = a;
            a = (temporary1 + temporary2) >>> 0;
        }

        h0 = (h0 + a) >>> 0;
        h1 = (h1 + b) >>> 0;
        h2 = (h2 + c) >>> 0;
        h3 = (h3 + d) >>> 0;
        h4 = (h4 + e) >>> 0;
        h5 = (h5 + f) >>> 0;
        h6 = (h6 + g) >>> 0;
        h7 = (h7 + h) >>> 0;
    }

    return [h0, h1, h2, h3, h4, h5, h6, h7].map((part) => part.toString(16).padStart(8, '0')).join('');
}

function stableId(endpointName: string, value: unknown, index: number): string {
    const raw = `${endpointName}:${JSON.stringify(value) ?? 'null'}`;
    const digest = sha256(raw).slice(0, 24);
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
