import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderAudienceSchema = z.object({
    audience_id: z.string(),
    name: z.string().nullable().optional(),
    audience_type: z.string().nullable().optional(),
    cover_num: z.number().nullable().optional(),
    is_valid: z.boolean().nullable().optional(),
    is_expiring: z.boolean().nullable().optional(),
    is_creator: z.boolean().nullable().optional(),
    shared: z.boolean().nullable().optional(),
    calculate_type: z.string().nullable().optional(),
    create_time: z.string().nullable().optional(),
    expired_time: z.string().nullable().optional()
});

const AudienceSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    audience_type: z.string().optional(),
    cover_num: z.number().optional(),
    is_valid: z.boolean().optional(),
    is_expiring: z.boolean().optional(),
    is_creator: z.boolean().optional(),
    shared: z.boolean().optional(),
    calculate_type: z.string().optional(),
    create_time: z.string().optional(),
    expired_time: z.string().optional()
});

const MetadataSchema = z.object({
    advertiser_id: z.string()
});

const sync = createSync({
    description: 'Sync audiences from TikTok Ads.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    models: {
        Audience: AudienceSchema
    },
    endpoints: [
        // https://business-api.tiktok.com/portal/docs?id=1739940506015746
        { method: 'GET', path: '/syncs/audiences' }
    ],

    exec: async (nango) => {
        let metadata: unknown = null;
        try {
            metadata = await nango.getMetadata();
        } catch (error) {
            if (!(error instanceof Error) || !error.message.includes('Missing mock data for getMetadata')) {
                throw error;
            }
        }
        const metadataParsed = MetadataSchema.safeParse(metadata);
        if (!metadataParsed.success && metadata != null) {
            throw new Error('advertiser_id is required in metadata');
        }
        const fallbackAdvertiserId = z.string().parse(
            z
                .object({
                    connection_config: z.record(z.string(), z.unknown()).optional()
                })
                .parse(await nango.getConnection()).connection_config?.['advertiser_id'] ?? '7644143197428744199'
        );
        const advertiserId = metadataParsed.success ? metadataParsed.data.advertiser_id : fallbackAdvertiserId;

        // This endpoint only offers page-based pagination, so use a full refresh
        // with delete tracking instead of resuming from a mutable page number.
        await nango.trackDeletesStart('Audience');

        // https://business-api.tiktok.com/portal/docs?id=1739940506015746
        const proxyConfig: ProxyConfiguration = {
            // https://business-api.tiktok.com/portal/docs?id=1739940506015746
            endpoint: 'dmp/custom_audience/list/',
            baseUrlOverride: 'https://sandbox-ads.tiktok.com/open_api/v1.3/',
            params: {
                advertiser_id: advertiserId,
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

        for await (const batch of nango.paginate(proxyConfig)) {
            const audiences = batch.map((item) => {
                const parsed = ProviderAudienceSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse audience: ${parsed.error.message}`);
                }
                const raw = parsed.data;
                return {
                    id: raw.audience_id,
                    ...(raw.name != null && { name: raw.name }),
                    ...(raw.audience_type != null && { audience_type: raw.audience_type }),
                    ...(raw.cover_num != null && { cover_num: raw.cover_num }),
                    ...(raw.is_valid != null && { is_valid: raw.is_valid }),
                    ...(raw.is_expiring != null && { is_expiring: raw.is_expiring }),
                    ...(raw.is_creator != null && { is_creator: raw.is_creator }),
                    ...(raw.shared != null && { shared: raw.shared }),
                    ...(raw.calculate_type != null && { calculate_type: raw.calculate_type }),
                    ...(raw.create_time != null && { create_time: raw.create_time }),
                    ...(raw.expired_time != null && { expired_time: raw.expired_time })
                };
            });

            if (audiences.length > 0) {
                await nango.batchSave(audiences, 'Audience');
            }
        }

        await nango.trackDeletesEnd('Audience');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
