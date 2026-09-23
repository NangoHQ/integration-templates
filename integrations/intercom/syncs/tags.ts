import { createSync } from 'nango';
import { z } from 'zod';

const IntercomTagSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    created_at: z.number().optional(),
    updated_at: z.number().optional()
});

const IntercomTagsResponseSchema = z.object({
    type: z.string(),
    data: z.array(IntercomTagSchema),
    pages: z
        .object({
            next: z
                .object({
                    starting_after: z.string()
                })
                .optional(),
            page: z.number().optional(),
            per_page: z.number().optional(),
            total_pages: z.number().optional()
        })
        .optional()
});

const TagSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    created_at: z.number().optional(),
    updated_at: z.number().optional()
});

const CheckpointSchema = z.object({
    starting_after: z.string()
});

const sync = createSync({
    description: 'Sync tags from Intercom',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Tag: TagSchema
    },
    endpoints: [
        {
            path: '/syncs/tags',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        // Blocker: The /tags endpoint does not support incremental filtering
        // (no updated_since, created_since, or similar parameters).
        // It returns the complete set of tags on every request.
        const checkpoint = await nango.getCheckpoint();
        const checkpointParsed = CheckpointSchema.safeParse(checkpoint);

        let startingAfter: string | undefined = checkpointParsed.success ? checkpointParsed.data.starting_after : undefined;

        await nango.trackDeletesStart('Tag');

        let hasMore = true;

        while (hasMore) {
            // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Tags
            const response = await nango.get({
                endpoint: '/tags',
                headers: {
                    'Intercom-Version': '2.11'
                },
                params: {
                    per_page: 150,
                    ...(startingAfter && { starting_after: startingAfter })
                },
                retries: 3
            });

            const parsed = IntercomTagsResponseSchema.parse(response.data);
            const tags = parsed.data;

            if (tags.length > 0) {
                const mappedTags = tags.map((tag) => ({
                    id: tag.id,
                    name: tag.name,
                    type: tag.type,
                    created_at: tag.created_at,
                    updated_at: tag.updated_at
                }));

                await nango.batchSave(mappedTags, 'Tag');
            }

            const nextStartingAfter = parsed.pages?.next?.starting_after;
            if (nextStartingAfter) {
                startingAfter = nextStartingAfter;
                await nango.saveCheckpoint({ starting_after: nextStartingAfter });
            } else {
                hasMore = false;
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Tag');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
