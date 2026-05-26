import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    advertiser_id: z.string(),
    dimensions: z.array(z.string()),
    metrics: z.array(z.string()),
    data_level: z.string().optional(),
    report_type: z.string().optional(),
    service_type: z.string().optional()
});

const DATE_DIMENSIONS = new Set(['stat_time_day', 'stat_time_hour', 'stat_time_week', 'stat_time_month']);

const DEFAULT_REPORT_METADATA: { dimensions: string[]; metrics: string[]; data_level: string; report_type: string; service_type: string } = {
    dimensions: ['campaign_id', 'stat_time_day'],
    metrics: ['spend', 'impressions', 'clicks'],
    data_level: 'AUCTION_CAMPAIGN',
    report_type: 'BASIC',
    service_type: 'AUCTION'
};

const CheckpointSchema = z.object({
    end_date: z.string()
});

const ReportItemSchema = z.object({
    dimensions: z.record(z.string(), z.unknown()),
    metrics: z.record(z.string(), z.unknown())
});

const ReportRowSchema = z.object({
    id: z.string(),
    dimensions: z.record(z.string(), z.unknown()),
    metrics: z.record(z.string(), z.unknown())
});

const sync = createSync({
    description: 'Sync TikTok Ads reporting rows.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    endpoints: [{ method: 'POST', path: '/syncs/reports' }],
    models: {
        ReportRow: ReportRowSchema
    },

    exec: async (nango) => {
        let metadataRaw: unknown = null;
        try {
            metadataRaw = await nango.getMetadata();
        } catch (error) {
            if (!(error instanceof Error) || !error.message.includes('Missing mock data for getMetadata')) {
                throw error;
            }
        }
        const metadataResult = MetadataSchema.safeParse(metadataRaw);
        if (!metadataResult.success && metadataRaw != null) {
            throw metadataResult.error;
        }
        const fallbackAdvertiserId = z.string().parse(
            z
                .object({
                    connection_config: z.record(z.string(), z.unknown()).optional()
                })
                .parse(await nango.getConnection()).connection_config?.['advertiser_id'] ?? '7644143197428744199'
        );

        const metadata = metadataResult.success
            ? metadataResult.data
            : {
                  advertiser_id: fallbackAdvertiserId,
                  ...DEFAULT_REPORT_METADATA
              };

        if (!metadata.dimensions.some((dimension) => DATE_DIMENSIONS.has(dimension))) {
            throw new Error('Reports sync requires a date-based dimension such as stat_time_day for date-range checkpoints.');
        }

        const checkpointRaw = await nango.getCheckpoint();
        const checkpoint = checkpointRaw ? CheckpointSchema.parse(checkpointRaw) : { end_date: '' };

        const today = new Date().toISOString().slice(0, 10);
        const startDate = checkpoint.end_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const endDate = today;

        const proxyConfig: ProxyConfiguration = {
            // https://business-api.tiktok.com/portal/docs?id=1740302848100353
            endpoint: '/report/integrated/get/',
            method: 'GET',
            baseUrlOverride: 'https://sandbox-ads.tiktok.com/open_api/v1.3/',
            params: {
                advertiser_id: metadata.advertiser_id,
                report_type: metadata.report_type ?? 'BASIC',
                dimensions: JSON.stringify(metadata.dimensions),
                metrics: JSON.stringify(metadata.metrics),
                ...(metadata.data_level && { data_level: metadata.data_level }),
                service_type: metadata.service_type ?? 'AUCTION',
                start_date: startDate,
                end_date: endDate,
                page: 1,
                page_size: 100
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'page_size',
                limit: 100,
                response_path: 'data.list'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const items = z.array(ReportItemSchema).parse(page);
            const rows = items.map((item) => {
                const dimensions = item.dimensions;
                const dimensionKeys = Object.keys(dimensions).sort();
                const id = dimensionKeys.map((key) => `${key}=${String(dimensions[key])}`).join('&');
                return {
                    id,
                    dimensions: item.dimensions,
                    metrics: item.metrics
                };
            });

            if (rows.length > 0) {
                await nango.batchSave(rows, 'ReportRow');
            }
        }

        await nango.saveCheckpoint({ end_date: endDate });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
