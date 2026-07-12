import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderStorySchema = z
    .object({
        id: z.number().int(),
        updated_at: z.string()
    })
    .passthrough();

const StorySchema = z
    .object({
        id: z.string(),
        updated_at: z.string()
    })
    .passthrough();

const CheckpointSchema = z.object({}).catchall(z.union([z.string(), z.number(), z.boolean()]));

const sync = createSync({
    description: 'Sync stories.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Story: StorySchema
    },

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? {});
        const updatedAfter = typeof checkpoint['updated_after'] === 'string' ? checkpoint['updated_after'] : undefined;
        const isFullCrawl = !updatedAfter;

        const data: Record<string, unknown> = {};
        if (updatedAfter) {
            data['updated_at_start'] = updatedAfter;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://developer.shortcut.com/api/rest/v3
            endpoint: '/api/v3/stories/search',
            method: 'POST',
            data,
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'next',
                cursor_path_in_response: 'next'
            },
            retries: 3
        };

        if (isFullCrawl) {
            await nango.trackDeletesStart('Story');
        }

        let maxUpdatedAt: string | undefined;

        for await (const page of nango.paginate(proxyConfig)) {
            let rawStories: unknown[];
            if (Array.isArray(page)) {
                rawStories = page;
            } else if (page && typeof page === 'object') {
                const envelope = z
                    .object({
                        data: z.array(z.unknown()),
                        next: z.string().optional()
                    })
                    .parse(page);
                rawStories = envelope.data;
            } else {
                throw new Error('Unexpected response format from stories search');
            }

            if (rawStories.length === 0) {
                continue;
            }

            const stories = rawStories.map((item) => {
                const story = ProviderStorySchema.parse(item);
                const { id, ...rest } = story;
                return {
                    id: String(id),
                    ...rest
                };
            });

            await nango.batchSave(stories, 'Story');

            for (const story of stories) {
                if (maxUpdatedAt === undefined || story.updated_at > maxUpdatedAt) {
                    maxUpdatedAt = story.updated_at;
                }
            }
        }

        if (isFullCrawl) {
            await nango.trackDeletesEnd('Story');
        }

        const nextCheckpoint = maxUpdatedAt ?? new Date().toISOString();
        await nango.saveCheckpoint({ updated_after: nextCheckpoint });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
