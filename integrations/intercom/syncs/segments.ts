import { createSync } from 'nango';
import { z } from 'zod';

const SegmentSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string().optional(),
    created_at: z.number().optional(),
    updated_at: z.number().optional(),
    person_type: z.string().optional(),
    count: z.number().optional()
});

const IntercomSegmentSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string().optional(),
    created_at: z.number().optional(),
    updated_at: z.number().optional(),
    person_type: z.string().optional(),
    count: z.number().optional()
});

const IntercomSegmentsResponseSchema = z.object({
    type: z.string().optional(),
    segments: z.array(IntercomSegmentSchema).optional(),
    pages: z
        .object({
            type: z.string().optional(),
            next: z
                .object({
                    page: z.number().optional(),
                    starting_after: z.string().optional()
                })
                .optional(),
            total_pages: z.number().optional()
        })
        .optional()
});

const CheckpointSchema = z.object({
    starting_after: z.string()
});

const sync = createSync({
    description: 'Sync contact segments from Intercom.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Segment: SegmentSchema
    },
    endpoints: [
        {
            path: '/syncs/segments',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        // Full refresh reference sync for segment definitions.
        // Blocker: Intercom's /segments endpoint returns all segments without
        // an updated_at filter for incremental fetching. Segments are reference
        // data that change infrequently (segment definitions, not membership).
        const checkpoint = await nango.getCheckpoint();
        const checkpointParsed = CheckpointSchema.safeParse(checkpoint);
        let startingAfter: string | undefined = checkpointParsed.success ? checkpointParsed.data.starting_after : undefined;

        await nango.trackDeletesStart('Segment');

        do {
            // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Segments
            const response = await nango.get({
                endpoint: '/segments',
                headers: {
                    'Intercom-Version': '2.11'
                },
                params: {
                    per_page: 150,
                    ...(startingAfter && { starting_after: startingAfter })
                },
                retries: 3
            });

            const parsed = IntercomSegmentsResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse segments response: ${parsed.error.message}`);
            }

            const segments = parsed.data.segments || [];
            const mappedSegments = segments.map((segment) => ({
                id: segment.id,
                name: segment.name,
                ...(segment.type !== undefined && { type: segment.type }),
                ...(segment.created_at !== undefined && { created_at: segment.created_at }),
                ...(segment.updated_at !== undefined && { updated_at: segment.updated_at }),
                ...(segment.person_type !== undefined && { person_type: segment.person_type }),
                ...(segment.count !== undefined && { count: segment.count })
            }));

            if (mappedSegments.length > 0) {
                await nango.batchSave(mappedSegments, 'Segment');
            }

            startingAfter = parsed.data.pages?.next?.starting_after;

            if (startingAfter) {
                await nango.saveCheckpoint({ starting_after: startingAfter });
            }
        } while (startingAfter);

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Segment');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
