import { createSync, ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    team_id: z.string()
});

const ProviderUserSchema = z.object({
    id: z.string(),
    handle: z.string(),
    img_url: z.string()
});

const ProviderStyleSchema = z.object({
    key: z.string(),
    file_key: z.string(),
    node_id: z.string().nullish(),
    style_type: z.string().nullish(),
    thumbnail_url: z.string().nullish(),
    name: z.string().nullish(),
    description: z.string().nullish(),
    created_at: z.string().nullish(),
    updated_at: z.string().nullish(),
    sort_position: z.string().nullish(),
    user: ProviderUserSchema.nullish()
});

const StyleSchema = z.object({
    id: z.string(),
    key: z.string(),
    file_key: z.string(),
    node_id: z.string().optional(),
    style_type: z.string().optional(),
    thumbnail_url: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    sort_position: z.string().optional(),
    user_id: z.string().optional(),
    user_handle: z.string().optional(),
    user_img_url: z.string().optional()
});

const sync = createSync({
    description: 'Sync styles from Figma',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    models: {
        Style: StyleSchema
    },
    // https://developers.figma.com/docs/rest-api/component-endpoints/
    endpoints: [{ method: 'GET', path: '/syncs/styles' }],

    exec: async (nango) => {
        const metadataResult = MetadataSchema.safeParse(await nango.getMetadata());
        if (!metadataResult.success) {
            throw new Error('team_id is required in metadata');
        }

        const metadata = metadataResult.data;

        // Blocker: provider only exposes /v1/teams/{team_id}/styles with no
        // changed-since filter and only positional cursor pagination. Without
        // append-only ordering, a cross-run checkpoint is not safe here.
        await nango.trackDeletesStart('Style');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.figma.com/docs/rest-api/component-endpoints/
            endpoint: `/v1/teams/${encodeURIComponent(metadata.team_id)}/styles`,
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'after',
                cursor_path_in_response: 'meta.cursor.after',
                response_path: 'meta.styles',
                limit_name_in_request: 'page_size',
                limit: 30
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const styles = [];
            for (const raw of page) {
                const parsed = ProviderStyleSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse style: ${parsed.error.message}`);
                }

                const record = parsed.data;
                const style = {
                    id: record.key,
                    key: record.key,
                    file_key: record.file_key,
                    ...(record.node_id != null ? { node_id: record.node_id } : {}),
                    ...(record.style_type != null ? { style_type: record.style_type } : {}),
                    ...(record.thumbnail_url != null ? { thumbnail_url: record.thumbnail_url } : {}),
                    ...(record.name != null ? { name: record.name } : {}),
                    ...(record.description != null ? { description: record.description } : {}),
                    ...(record.created_at != null ? { created_at: record.created_at } : {}),
                    ...(record.updated_at != null ? { updated_at: record.updated_at } : {}),
                    ...(record.sort_position != null ? { sort_position: record.sort_position } : {}),
                    ...(record.user != null
                        ? {
                              user_id: record.user.id,
                              user_handle: record.user.handle,
                              user_img_url: record.user.img_url
                          }
                        : {})
                };

                styles.push(style);
            }

            if (styles.length > 0) {
                await nango.batchSave(styles, 'Style');
            }
        }

        await nango.trackDeletesEnd('Style');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
