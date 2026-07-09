import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const BoardSchema = z.object({
    id: z.string(),
    name: z.string().nullish(),
    description: z.string().nullish(),
    privacy: z.string().nullish(),
    owner: z
        .object({
            username: z.string().nullish()
        })
        .nullish(),
    created_at: z.string().nullish(),
    pin_count: z.number().nullish(),
    collaborator_count: z.number().nullish(),
    layout: z.string().nullish(),
    is_collaborative: z.boolean().nullish(),
    has_idea_pins: z.boolean().nullish(),
    follower_count: z.number().nullish(),
    image_cover_url: z.string().nullish(),
    thumbnail_urls: z.array(z.string()).nullish()
});

const RawBoardSchema = BoardSchema.extend({
    media: z
        .object({
            image_cover_url: z.string().nullish(),
            pin_thumbnail_urls: z.array(z.string()).nullish()
        })
        .nullish()
}).passthrough();

const sync = createSync({
    description: 'Sync boards.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Board: BoardSchema
    },

    exec: async (nango) => {
        // Boards can be hard-deleted and the list endpoint has no incremental filter.
        // We need a full page-1 crawl on every successful run so delete tracking stays correct.
        // https://developers.pinterest.com/docs/api/v5/#tag/boards
        await nango.trackDeletesStart('Board');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.pinterest.com/docs/api/v5/#tag/boards
            endpoint: '/v5/boards',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'bookmark',
                cursor_path_in_response: 'bookmark',
                response_path: 'items',
                limit_name_in_request: 'page_size',
                limit: 250
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const items: unknown[] = page;

            const boards = items.map((record) => {
                const parsed = RawBoardSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse board: ${parsed.error.message}`);
                }

                const raw = parsed.data;
                const media = raw.media;

                return {
                    id: raw.id,
                    name: raw.name,
                    description: raw.description,
                    privacy: raw.privacy,
                    owner: raw.owner,
                    created_at: raw.created_at,
                    pin_count: raw.pin_count,
                    collaborator_count: raw.collaborator_count,
                    layout: raw.layout,
                    is_collaborative: raw.is_collaborative,
                    has_idea_pins: raw.has_idea_pins,
                    follower_count: raw.follower_count,
                    image_cover_url: raw.image_cover_url ?? media?.image_cover_url,
                    thumbnail_urls: raw.thumbnail_urls ?? media?.pin_thumbnail_urls
                };
            });

            if (boards.length > 0) {
                await nango.batchSave(boards, 'Board');
            }
        }

        await nango.trackDeletesEnd('Board');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
