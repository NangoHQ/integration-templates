import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const SloSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional(),
        type: z.string().optional(),
        tags: z.array(z.string()).optional(),
        created_at: z.number().optional(),
        modified_at: z.number().optional()
    })
    .passthrough();

const CheckpointSchema = z.object({
    offset: z.number().int().nonnegative()
});

const sync = createSync({
    description: 'Sync Service Level Objectives.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Slo: SloSchema
    },

    exec: async (nango) => {
        const checkpoint: z.infer<typeof CheckpointSchema> | null = await nango.getCheckpoint();
        let offset = checkpoint?.offset ?? 0;

        await nango.trackDeletesStart('Slo');

        const proxyConfig: ProxyConfiguration = {
            // https://docs.datadoghq.com/api/latest/service-level-objectives/
            endpoint: 'v1/slo',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: offset,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'data'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const slos = page.map((record: unknown) => {
                const parsed = SloSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse SLO: ${parsed.error.message}`);
                }
                return parsed.data;
            });

            if (slos.length > 0) {
                await nango.batchSave(slos, 'Slo');
                offset += slos.length;
                await nango.saveCheckpoint({ offset });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Slo');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
