import { createSync } from 'nango';
import { z } from 'zod';

const SourceTypeSchema = z.object({
    id: z.string(),
    title: z.string(),
    isArchived: z.boolean()
});

const SourceSchema = z.object({
    id: z.string(),
    title: z.string(),
    isArchived: z.boolean(),
    sourceType: SourceTypeSchema.optional()
});

const ResponseSchema = z.object({
    success: z.boolean(),
    results: z.array(
        z.object({
            id: z.string(),
            title: z.string(),
            isArchived: z.boolean(),
            sourceType: SourceTypeSchema.optional()
        })
    ),
    moreDataAvailable: z.boolean(),
    nextCursor: z.string().optional()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync sources from Ashby.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Source: SourceSchema
    },
    // https://developers.ashbyhq.com/reference/sourcelist
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/sources'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let nextCursor: string | null = checkpoint?.cursor || null;

        await nango.trackDeletesStart('Source');

        do {
            // https://developers.ashbyhq.com/reference/sourcelist
            const response = await nango.post({
                endpoint: '/source.list',
                data: {
                    includeArchived: true,
                    ...(nextCursor && { cursor: nextCursor })
                },
                retries: 3
            });

            const envelope = ResponseSchema.parse(response.data);

            if (!envelope.success) {
                throw new Error('Ashby API returned a non-success response for source.list');
            }

            const sources = envelope.results.map((item) => SourceSchema.parse(item));

            if (sources.length > 0) {
                await nango.batchSave(sources, 'Source');
            }

            nextCursor = envelope.nextCursor ?? null;

            if (nextCursor) {
                await nango.saveCheckpoint({ cursor: nextCursor });
            }
        } while (nextCursor);

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Source');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
