import { createSync } from 'nango';
import { z } from 'zod';

const AircallTagSchema = z.object({
    id: z.number(),
    name: z.string(),
    color: z.string().nullable().optional(),
    description: z.string().nullable().optional()
});

const TagSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().optional(),
    description: z.string().optional()
});

const AircallTagsPageSchema = z.object({
    tags: z.array(AircallTagSchema),
    meta: z
        .object({
            next_page_link: z.string().nullable().optional()
        })
        .passthrough()
});

const CheckpointSchema = z.object({
    page: z.number()
});

const sync = createSync({
    description: 'Sync tags from Aircall',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Tag: TagSchema
    },

    exec: async (nango) => {
        // Blocker: GET /v1/tags does not support updated_after, cursor, or any
        // changed-since filter. There is no deleted-record endpoint for tags.
        // Full refresh with deletion detection is required.

        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointParse = rawCheckpoint == null ? null : CheckpointSchema.safeParse(rawCheckpoint);
        if (checkpointParse != null && !checkpointParse.success) {
            throw new Error(`Invalid checkpoint: ${checkpointParse.error.message}`);
        }
        const checkpoint = checkpointParse?.data;

        await nango.trackDeletesStart('Tag');

        let currentPage = checkpoint?.page ?? 1;

        while (true) {
            const response = await nango.get({
                // https://developer.aircall.io/api-references/#list-all-tags
                endpoint: '/v1/tags',
                params: {
                    page: currentPage,
                    per_page: 50
                },
                retries: 3
            });

            const pageParse = AircallTagsPageSchema.safeParse(response.data);
            if (!pageParse.success) {
                throw new Error(`Failed to parse tags page: ${pageParse.error.message}`);
            }

            const tags = pageParse.data.tags.map((tag) => {
                const mapped = {
                    id: String(tag.id),
                    name: tag.name,
                    ...(tag.color != null && { color: tag.color }),
                    ...(tag.description != null && { description: tag.description })
                };
                const mappedParse = TagSchema.safeParse(mapped);
                if (!mappedParse.success) {
                    throw new Error(`Failed to validate mapped tag: ${mappedParse.error.message}`);
                }
                return mappedParse.data;
            });

            if (tags.length > 0) {
                await nango.batchSave(tags, 'Tag');
            }

            if (pageParse.data.meta.next_page_link == null) {
                await nango.clearCheckpoint();
                break;
            }

            currentPage += 1;
            await nango.saveCheckpoint({ page: currentPage });
        }

        await nango.trackDeletesEnd('Tag');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
