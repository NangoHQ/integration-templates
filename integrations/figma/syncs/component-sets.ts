import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ComponentSetSchema = z.object({
    id: z.string(),
    key: z.string().optional(),
    file_key: z.string().optional(),
    node_id: z.string().optional(),
    thumbnail_url: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    updated_at: z.string().optional(),
    created_at: z.string().optional(),
    user: z.unknown().optional(),
    containing_frame: z.unknown().optional()
});

const MetadataSchema = z.object({
    team_id: z.string()
});

const sync = createSync({
    description: 'Sync component sets from Figma',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    models: {
        ComponentSet: ComponentSetSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/component-sets'
        }
    ],

    exec: async (nango) => {
        const metadata = await nango.getMetadata<z.infer<typeof MetadataSchema>>();

        if (!metadata?.team_id) {
            throw new Error('team_id is required in metadata');
        }

        // Blocker: Figma GET /v1/teams/{team_id}/component_sets only exposes
        // positional cursor pagination. It does not provide a changed-since
        // filter or append-only ordering we can checkpoint safely across runs,
        // so this sync must do a full refresh with delete tracking.

        // https://www.figma.com/developers/api#get-team-component-sets-endpoint
        const proxyConfig: ProxyConfiguration = {
            // https://www.figma.com/developers/api#get-team-component-sets-endpoint
            endpoint: `/v1/teams/${encodeURIComponent(metadata.team_id)}/component_sets`,
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'after',
                cursor_path_in_response: 'meta.cursor.after',
                response_path: 'meta.component_sets',
                limit_name_in_request: 'page_size',
                limit: 30
            },
            retries: 3
        };

        await nango.trackDeletesStart('ComponentSet');

        for await (const page of nango.paginate(proxyConfig)) {
            const componentSets = page.map((item: unknown) => {
                const raw = z
                    .object({
                        key: z.string(),
                        file_key: z.string().nullish(),
                        node_id: z.string().nullish(),
                        thumbnail_url: z.string().nullish(),
                        name: z.string().nullish(),
                        description: z.string().nullish(),
                        updated_at: z.string().nullish(),
                        created_at: z.string().nullish(),
                        user: z.unknown().optional(),
                        containing_frame: z.unknown().optional()
                    })
                    .parse(item);

                return {
                    id: raw.key,
                    ...(raw.file_key != null && { file_key: raw.file_key }),
                    ...(raw.node_id != null && { node_id: raw.node_id }),
                    ...(raw.thumbnail_url != null && { thumbnail_url: raw.thumbnail_url }),
                    ...(raw.name != null && { name: raw.name }),
                    ...(raw.description != null && { description: raw.description }),
                    ...(raw.updated_at != null && { updated_at: raw.updated_at }),
                    ...(raw.created_at != null && { created_at: raw.created_at }),
                    ...(raw.user !== undefined && { user: raw.user }),
                    ...(raw.containing_frame !== undefined && { containing_frame: raw.containing_frame })
                };
            });

            if (componentSets.length > 0) {
                await nango.batchSave(componentSets, 'ComponentSet');
            }
        }

        await nango.trackDeletesEnd('ComponentSet');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
