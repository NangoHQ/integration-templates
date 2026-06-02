import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    team_id: z.string()
});

const UserSchema = z.object({
    id: z.string(),
    handle: z.string(),
    img_url: z.string().optional()
});

const FrameInfoSchema = z.object({
    nodeId: z.string().optional(),
    name: z.string().optional(),
    backgroundColor: z.string().optional(),
    pageId: z.string(),
    pageName: z.string(),
    containingStateGroup: z
        .object({
            nodeId: z.string().optional(),
            name: z.string().optional()
        })
        .nullable()
        .optional(),
    containingComponentSet: z
        .object({
            nodeId: z.string().optional(),
            name: z.string().optional()
        })
        .nullable()
        .optional()
});

const ProviderComponentSchema = z.object({
    key: z.string(),
    file_key: z.string(),
    node_id: z.string(),
    thumbnail_url: z.string().optional(),
    name: z.string(),
    description: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    user: UserSchema.optional(),
    containing_frame: FrameInfoSchema.optional()
});

const ComponentSchema = z.object({
    id: z.string(),
    file_key: z.string(),
    node_id: z.string(),
    thumbnail_url: z.string().optional(),
    name: z.string(),
    description: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    user: UserSchema.optional(),
    containing_frame: FrameInfoSchema.optional()
});

const sync = createSync({
    description: 'Sync components from Figma.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/components'
        }
    ],
    models: {
        Component: ComponentSchema
    },

    exec: async (nango) => {
        const metadataRaw = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(metadataRaw);
        if (!metadataResult.success) {
            throw new Error('team_id is required in metadata');
        }
        const metadata = metadataResult.data;

        // Blocker: GET /v1/teams/{team_id}/components does not support updated_after,
        // modified_since, or any changed-since filter. It only supports page_size and
        // after/before cursor pagination, so we must walk the full dataset each run.
        await nango.trackDeletesStart('Component');

        const proxyConfig: ProxyConfiguration = {
            // https://www.figma.com/developers/api#get-team-components-endpoint
            endpoint: `/v1/teams/${encodeURIComponent(metadata.team_id)}/components`,
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'after',
                cursor_path_in_response: 'meta.cursor.after',
                response_path: 'meta.components',
                limit_name_in_request: 'page_size',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected page to be an array');
            }

            const components = page.map((record) => {
                const parsed = ProviderComponentSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse component: ${parsed.error.message}`);
                }

                const data = parsed.data;
                return {
                    id: data.key,
                    file_key: data.file_key,
                    node_id: data.node_id,
                    ...(data.thumbnail_url != null && { thumbnail_url: data.thumbnail_url }),
                    name: data.name,
                    ...(data.description != null && { description: data.description }),
                    created_at: data.created_at,
                    updated_at: data.updated_at,
                    ...(data.user != null && { user: data.user }),
                    ...(data.containing_frame != null && { containing_frame: data.containing_frame })
                };
            });

            if (components.length > 0) {
                await nango.batchSave(components, 'Component');
            }
        }

        await nango.trackDeletesEnd('Component');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
