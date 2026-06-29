import { createSync } from 'nango';
import { z } from 'zod';

const ChannelSchema = z.object({
    id: z.number(),
    name: z.string(),
    external_id: z.string().optional(),
    is_listable_from_ui: z.boolean().optional(),
    is_enabled: z.boolean().optional(),
    is_visible: z.boolean().optional(),
    status: z.string().optional(),
    type: z.string().optional(),
    platform: z.string().optional(),
    date_created: z.string().optional(),
    date_modified: z.string().optional(),
    icon_url: z.string().optional()
});

const ChannelModel = z.object({
    id: z.string(),
    name: z.string(),
    external_id: z.string().optional(),
    is_listable_from_ui: z.boolean().optional(),
    is_enabled: z.boolean().optional(),
    is_visible: z.boolean().optional(),
    status: z.string().optional(),
    type: z.string().optional(),
    platform: z.string().optional(),
    date_created: z.string().optional(),
    date_modified: z.string().optional(),
    icon_url: z.string().optional()
});

const CheckpointSchema = z.object({
    updatedAfter: z.string(),
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync channels',
    version: '1.1.0',
    frequency: 'every hour',
    models: {
        Channel: ChannelModel
    },
    checkpoint: CheckpointSchema,
    scopes: ['store_channel_listings_read_only', 'store_channel_settings_read_only', 'store_sites_read_only'],
    exec: async (nango) => {
        const checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { updatedAfter: '', page: 1 });
        const updatedAfter = checkpoint.updatedAfter || undefined;
        let page: number | undefined = checkpoint.page;
        const syncStartedAt = new Date().toISOString();
        const isFullRefresh = !updatedAfter;

        if (isFullRefresh) {
            await nango.trackDeletesStart('Channel');
        }

        for await (const rawBatch of nango.paginate({
            // https://developer.bigcommerce.com/docs/rest-management/channels
            endpoint: '/v3/channels',
            params: {
                ...(updatedAfter && { 'date_modified:min': updatedAfter })
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'limit',
                limit: 50,
                response_path: 'data',
                on_page: async (state) => {
                    page = typeof state.nextPageParam === 'number' ? state.nextPageParam : undefined;
                }
            },
            retries: 3
        })) {
            const parsed = z.array(ChannelSchema).safeParse(rawBatch);
            if (!parsed.success) {
                throw new Error(`Failed to parse channels: ${parsed.error.message}`);
            }
            const records = parsed.data.map((channel) => ({
                id: String(channel.id),
                name: channel.name,
                external_id: channel.external_id,
                is_listable_from_ui: channel.is_listable_from_ui,
                is_enabled: channel.is_enabled,
                is_visible: channel.is_visible,
                status: channel.status,
                type: channel.type,
                platform: channel.platform,
                date_created: channel.date_created,
                date_modified: channel.date_modified,
                icon_url: channel.icon_url
            }));

            if (records.length > 0) {
                await nango.batchSave(records, 'Channel');
            }

            if (page !== undefined) {
                await nango.saveCheckpoint({
                    updatedAfter: updatedAfter || '',
                    page
                });
            }
        }

        if (isFullRefresh) {
            await nango.trackDeletesEnd('Channel');
        }

        await nango.saveCheckpoint({ updatedAfter: syncStartedAt, page: 1 });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
