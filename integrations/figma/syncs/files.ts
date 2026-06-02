import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderFileSchema = z.object({
    key: z.string(),
    name: z.string(),
    thumbnail_url: z.string().optional().nullable(),
    last_modified: z.string(),
    editor_type: z.string().optional().nullable()
});

const FileSchema = z.object({
    id: z.string(),
    name: z.string(),
    thumbnail_url: z.string().optional(),
    last_modified: z.string(),
    editor_type: z.string().optional()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const MetadataSchema = z.object({
    project_id: z.string()
});

const sync = createSync({
    description: 'Sync files from Figma.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        File: FileSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/files'
        }
    ],

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const metadata = MetadataSchema.parse(rawMetadata);

        if (!metadata.project_id) {
            throw new Error('project_id is required in metadata');
        }

        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = CheckpointSchema.parse(rawCheckpoint ?? { cursor: '' });
        let cursor = checkpoint.cursor || undefined;

        await nango.trackDeletesStart('File');

        const proxyConfig: ProxyConfiguration = {
            // https://www.figma.com/developers/api#get-project-files-endpoint
            endpoint: `/v1/projects/${encodeURIComponent(metadata.project_id)}/files`,
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'cursor',
                response_path: 'files',
                limit_name_in_request: 'page_size',
                limit: 100,
                on_page: async (pageInfo) => {
                    cursor = typeof pageInfo.nextPageParam === 'string' ? pageInfo.nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const parsedPage = z.array(ProviderFileSchema).parse(page);

            const files = parsedPage.map((file) => ({
                id: file.key,
                name: file.name,
                ...(file.thumbnail_url != null && { thumbnail_url: file.thumbnail_url }),
                last_modified: file.last_modified,
                ...(file.editor_type != null && { editor_type: file.editor_type })
            }));

            if (files.length > 0) {
                await nango.batchSave(files, 'File');
            }

            if (cursor !== undefined) {
                await nango.saveCheckpoint({ cursor });
            }
        }

        await nango.trackDeletesEnd('File');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
