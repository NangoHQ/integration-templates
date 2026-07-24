import { createSync } from 'nango';
import { z } from 'zod';

const ProviderStageSchema = z.object({
    slug: z.string(),
    name: z.string(),
    kind: z.string(),
    position: z.number().int()
});

const ProviderResponseSchema = z.object({
    stages: z.array(ProviderStageSchema)
});

const StageSchema = z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    kind: z.string(),
    position: z.number().int()
});

const CheckpointSchema = z.object({});

const sync = createSync({
    description: 'Sync account-level recruitment pipeline stages.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['r_jobs'],
    checkpoint: CheckpointSchema,
    models: {
        Stage: StageSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        // Blocker: the /stages endpoint has no changed-since filter, no pagination,
        // and no deleted-record endpoint. The dataset is small and low-churn,
        // so a full snapshot with delete tracking is appropriate.
        // https://workable.readme.io/reference/stages
        const response = await nango.get({
            endpoint: '/spi/v3/stages',
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse stages response: ${parsed.error.message}`);
        }

        const stages = parsed.data.stages.map((stage) => ({
            id: stage.slug,
            slug: stage.slug,
            name: stage.name,
            kind: stage.kind,
            position: stage.position
        }));

        // Only start delete-tracking once the request has succeeded and the response has been
        // validated, so a failed/invalid fetch never leaves deletion-tracking permanently "open".
        await nango.trackDeletesStart('Stage');

        if (stages.length > 0) {
            await nango.batchSave(stages, 'Stage');
        }

        await nango.trackDeletesEnd('Stage');

        if (checkpoint) {
            await nango.saveCheckpoint({});
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
