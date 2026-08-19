import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const LeverStageSchema = z.object({
    id: z.string(),
    text: z.string()
});

const CheckpointSchema = z.object({
    offset: z.string()
});

const sync = createSync({
    description: 'Fetches a list of all pipeline stages in Lever',
    version: '3.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        LeverStage: LeverStageSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        let offset = checkpoint?.offset ?? '';

        let totalRecords = 0;

        await nango.trackDeletesStart('LeverStage');

        const LIMIT = 100;

        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#list-all-stages
            endpoint: '/v1/stages',
            params: {
                limit: LIMIT,
                ...(offset ? { offset } : {})
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'next',
                cursor_name_in_request: 'offset',
                limit_name_in_request: 'limit',
                response_path: 'data',
                limit: LIMIT,
                on_page: async ({ nextPageParam }) => {
                    offset = typeof nextPageParam === 'string' ? nextPageParam : '';
                }
            },
            retries: 3
        };

        for await (const stage of nango.paginate(config)) {
            const mappedStage = stage.map(mapStage);

            const batchSize = mappedStage.length;
            totalRecords += batchSize;
            await nango.log(`Saving batch of ${batchSize} stage(s) (total stage(s): ${totalRecords})`);
            await nango.batchSave(mappedStage, 'LeverStage');
            await nango.saveCheckpoint({ offset });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('LeverStage');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

function mapStage(stage: unknown): z.infer<typeof LeverStageSchema> {
    const parsed = LeverStageSchema.safeParse(stage);
    if (!parsed.success) {
        throw new Error(`Invalid stage record: ${parsed.error.message}`);
    }
    return parsed.data;
}
