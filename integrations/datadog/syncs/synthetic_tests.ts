import { createSync } from 'nango';
import * as z from 'zod';

const syntheticTestSchema = z.object({
    id: z.string(),
    public_id: z.string(),
    name: z.string(),
    type: z.string(),
    subtype: z.string().optional(),
    status: z.string(),
    message: z.string().optional(),
    tags: z.array(z.string()).optional(),
    locations: z.array(z.string()).optional(),
    monitor_id: z.number().optional(),
    creator_email: z.string().optional(),
    creator_handle: z.string().optional(),
    creator_name: z.string().optional(),
    config: z.object({}).passthrough().optional(),
    options: z.object({}).passthrough().optional()
});

type SyntheticTest = z.infer<typeof syntheticTestSchema>;

const checkpointSchema = z.object({
    page_number: z.number().int().nonnegative()
});

const rawListResponseSchema = z.object({
    tests: z.array(z.unknown())
});

const rawSyntheticTestSchema = z.object({
    public_id: z.string(),
    name: z.string(),
    type: z.string(),
    subtype: z.string().optional(),
    status: z.string(),
    message: z.string().optional(),
    tags: z.array(z.string()).optional(),
    locations: z.array(z.string()).optional(),
    monitor_id: z.number().optional(),
    creator: z
        .object({
            email: z.string().optional(),
            handle: z.string().optional(),
            name: z.string().optional().nullable()
        })
        .optional(),
    config: z.object({}).passthrough().optional(),
    options: z.object({}).passthrough().optional()
});

const PAGE_SIZE = 100;

const sync = createSync({
    description: 'Sync Synthetic API/browser/mobile tests.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',
    models: {
        SyntheticTest: syntheticTestSchema
    },
    checkpoint: checkpointSchema,
    exec: async (nango) => {
        const checkpoint: z.infer<typeof checkpointSchema> | null = await nango.getCheckpoint();
        await nango.log('Starting synthetic tests sync', { checkpoint: checkpoint === null ? 'null' : JSON.stringify(checkpoint) });

        await nango.trackDeletesStart('SyntheticTest');

        let pageNumber = checkpoint?.page_number ?? 0;
        let hasMore = true;

        while (hasMore) {
            // https://docs.datadoghq.com/api/latest/synthetics/#get-the-list-of-all-synthetic-tests
            const response = await nango.get({
                endpoint: 'v1/synthetics/tests',
                retries: 3,
                params: {
                    page_size: PAGE_SIZE,
                    page_number: pageNumber
                }
            });

            const parsedList = rawListResponseSchema.safeParse(response.data);
            if (!parsedList.success) {
                throw new Error(`Failed to parse synthetic tests list: ${parsedList.error.message}`);
            }

            const testBatch = parsedList.data.tests;

            const mappedTests: SyntheticTest[] = [];
            for (const test of testBatch) {
                if (test && typeof test === 'object') {
                    const parsed = rawSyntheticTestSchema.safeParse(test);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse synthetic test: ${parsed.error.message}`);
                    }
                    const raw = parsed.data;
                    mappedTests.push({
                        id: raw.public_id,
                        public_id: raw.public_id,
                        name: raw.name,
                        type: raw.type,
                        subtype: raw.subtype,
                        status: raw.status,
                        message: raw.message,
                        tags: raw.tags,
                        locations: raw.locations,
                        monitor_id: raw.monitor_id,
                        creator_email: raw.creator?.email,
                        creator_handle: raw.creator?.handle,
                        creator_name: raw.creator?.name ?? undefined,
                        config: raw.config,
                        options: raw.options
                    });
                }
            }

            if (mappedTests.length > 0) {
                await nango.batchSave(mappedTests, 'SyntheticTest');
                await nango.log(`Saved ${mappedTests.length} synthetic tests from page ${pageNumber}`);
            }

            hasMore = testBatch.length === PAGE_SIZE;
            pageNumber += 1;
            if (testBatch.length > 0) {
                await nango.saveCheckpoint({ page_number: pageNumber });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('SyntheticTest');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
