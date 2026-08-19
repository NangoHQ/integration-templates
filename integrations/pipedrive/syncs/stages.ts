import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderStageSchema = z.object({
    id: z.union([z.number(), z.string()]),
    name: z.string(),
    pipeline_id: z.number(),
    order_nr: z.number(),
    is_deal_rot_enabled: z.boolean().optional(),
    days_to_rotten: z.number().nullish(),
    deal_probability: z.number().optional(),
    add_time: z.string(),
    update_time: z.string().nullish()
});

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
        let nextCursor: string | undefined = checkpoint?.cursor;

        // Delete tracking requires full enumeration — never resume from a saved cursor
        await nango.trackDeletesStart('Stage');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.pipedrive.com/docs/api/v1/Stages#getStages
            endpoint: '/v2/stages',
            params: {
                sort_by: 'update_time',
                sort_direction: 'asc',
                limit: 500,
                ...(nextCursor && { cursor: nextCursor })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'additional_data.next_cursor',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 500,
                on_page: async ({ nextPageParam }) => {
                    nextCursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const stages of nango.paginate<z.infer<typeof ProviderStageSchema>>(proxyConfig)) {
            const normalizedStages = stages.map((stage) => {
                const parsed = ProviderStageSchema.parse(stage);
                return {
                    id: String(parsed.id),
                    name: parsed.name,
                    pipeline_id: parsed.pipeline_id,
                    order_nr: parsed.order_nr,
                    ...(parsed.is_deal_rot_enabled !== undefined && { is_deal_rot_enabled: parsed.is_deal_rot_enabled }),
                    ...(parsed.days_to_rotten !== undefined && parsed.days_to_rotten !== null && { days_to_rotten: parsed.days_to_rotten }),
                    ...(parsed.deal_probability !== undefined && { deal_probability: parsed.deal_probability }),
                    add_time: parsed.add_time,
                    ...(parsed.update_time !== undefined && parsed.update_time !== null && { update_time: parsed.update_time })
                };
            });

            if (normalizedStages.length > 0) {
                await nango.batchSave(normalizedStages, 'Stage');
            }

            if (nextCursor !== undefined) {
                await nango.saveCheckpoint({ cursor: nextCursor });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Stage');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
