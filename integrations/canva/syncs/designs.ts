import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const DesignSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
    page_count: z.number().int().optional(),
    owner: z
        .object({
            user_id: z.string().optional(),
            team_id: z.string().optional()
        })
        .optional(),
    thumbnail: z
        .object({
            width: z.number().int().optional(),
            height: z.number().int().optional(),
            url: z.string().optional()
        })
        .optional(),
    urls: z
        .object({
            edit_url: z.string().optional(),
            view_url: z.string().optional()
        })
        .optional()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync design metadata.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Design: DesignSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/designs'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let cursor = checkpoint != null && typeof checkpoint['cursor'] === 'string' ? checkpoint['cursor'] : undefined;

        if (checkpoint == null) {
            await nango.trackDeletesStart('Design');
        }

        const proxyConfig: ProxyConfiguration = {
            // https://www.canva.dev/docs/connect/api-reference/designs/
            endpoint: '/rest/v1/designs',
            params: {
                ...(cursor != null && { continuation: cursor })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'continuation',
                cursor_path_in_response: 'continuation',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 50,
                on_page: async ({ nextPageParam }) => {
                    cursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const designs = page.map((record: unknown) => {
                const parsed = z
                    .object({
                        id: z.string(),
                        title: z.string().optional().nullable(),
                        created_at: z.number().int(),
                        updated_at: z.number().int(),
                        page_count: z.number().int().optional().nullable(),
                        owner: z
                            .object({
                                user_id: z.string().optional().nullable(),
                                team_id: z.string().optional().nullable()
                            })
                            .optional()
                            .nullable(),
                        thumbnail: z
                            .object({
                                width: z.number().int().optional().nullable(),
                                height: z.number().int().optional().nullable(),
                                url: z.string().optional().nullable()
                            })
                            .optional()
                            .nullable(),
                        urls: z
                            .object({
                                edit_url: z.string().optional().nullable(),
                                view_url: z.string().optional().nullable()
                            })
                            .optional()
                            .nullable()
                    })
                    .safeParse(record);

                if (!parsed.success) {
                    throw new Error(`Failed to parse design record: ${parsed.error.message}`);
                }

                const data = parsed.data;
                return {
                    id: data.id,
                    ...(data.title != null && { title: data.title }),
                    created_at: data.created_at,
                    updated_at: data.updated_at,
                    ...(data.page_count != null && { page_count: data.page_count }),
                    ...(data.owner != null && {
                        owner: {
                            ...(data.owner.user_id != null && { user_id: data.owner.user_id }),
                            ...(data.owner.team_id != null && { team_id: data.owner.team_id })
                        }
                    }),
                    ...(data.thumbnail != null && {
                        thumbnail: {
                            ...(data.thumbnail.width != null && { width: data.thumbnail.width }),
                            ...(data.thumbnail.height != null && { height: data.thumbnail.height }),
                            ...(data.thumbnail.url != null && { url: data.thumbnail.url })
                        }
                    }),
                    ...(data.urls != null && {
                        urls: {
                            ...(data.urls.edit_url != null && { edit_url: data.urls.edit_url }),
                            ...(data.urls.view_url != null && { view_url: data.urls.view_url })
                        }
                    })
                };
            });

            if (designs.length > 0) {
                await nango.batchSave(designs, 'Design');
            }

            if (cursor !== undefined) {
                await nango.saveCheckpoint({ cursor });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Design');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
