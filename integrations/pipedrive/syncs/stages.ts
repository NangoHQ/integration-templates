import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const StageSchema = z.object({
    id: z.string(),
    name: z.string(),
    pipeline_id: z.number(),
    order_nr: z.number(),
    is_deal_rot_enabled: z.boolean().optional(),
    days_to_rotten: z.number().optional(),
    deal_probability: z.number().optional(),
    add_time: z.string(),
    update_time: z.string().optional()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync stages from Pipedrive',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Stage: StageSchema
    },
    endpoints: [{ path: '/syncs/stages', method: 'POST' }],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let cursor = checkpoint?.cursor;

        // Blocker: The /stages endpoint only exposes cursor pagination,
        // so this remains a checkpointed full refresh.
        await nango.trackDeletesStart('Stage');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.pipedrive.com/docs/api/v1/Stages#getStages
            endpoint: '/v2/stages',
            params: {
                sort_by: 'update_time',
                sort_direction: 'asc',
                limit: 500,
                ...(cursor ? { cursor } : {})
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'additional_data.next_cursor',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 500,
                on_page: async ({ nextPageParam }) => {
                    cursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const stages of nango.paginate<{
            id: number | string;
            name: string;
            pipeline_id: number;
            order_nr: number;
            is_deal_rot_enabled?: boolean;
            days_to_rotten?: number | null;
            deal_probability?: number;
            add_time: string;
            update_time?: string | null;
        }>(proxyConfig)) {
            const normalizedStages = stages.map((stage) => ({
                id: String(stage.id),
                name: stage.name,
                pipeline_id: stage.pipeline_id,
                order_nr: stage.order_nr,
                ...(stage.is_deal_rot_enabled !== undefined && { is_deal_rot_enabled: stage.is_deal_rot_enabled }),
                ...(stage.days_to_rotten !== undefined && stage.days_to_rotten !== null && { days_to_rotten: stage.days_to_rotten }),
                ...(stage.deal_probability !== undefined && { deal_probability: stage.deal_probability }),
                add_time: stage.add_time,
                ...(stage.update_time !== undefined && stage.update_time !== null && { update_time: stage.update_time })
            }));

            if (normalizedStages.length > 0) {
                await nango.batchSave(normalizedStages, 'Stage');
            }

            if (cursor) {
                await nango.saveCheckpoint({ cursor });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Stage');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
