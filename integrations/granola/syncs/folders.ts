import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderFolderSchema = z.object({
    id: z.string(),
    object: z.string(),
    name: z.string(),
    parent_folder_id: z.string().nullable()
});

const FolderSchema = z
    .object({
        id: z.string().describe('Unique identifier for the folder'),
        name: z.string().describe('Name of the folder'),
        parent_folder_id: z.string().nullable().describe('ID of the parent folder, or null when this folder is top-level')
    })
    .describe('A folder for organizing meeting notes in Granola');

const CheckpointSchema = z.object({
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync folders (id, name, parent hierarchy)',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Folder: FolderSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        let cursor: string | undefined;

        if (rawCheckpoint !== null) {
            const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint);

            if (!parsedCheckpoint.success) {
                throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
            }

            cursor = parsedCheckpoint.data.cursor || undefined;
        }

        await nango.trackDeletesStart('Folder');

        let processedAnyPage = false;

        const proxyConfig: ProxyConfiguration = {
            // https://docs.granola.ai/api-reference/list-folders.md
            endpoint: '/v1/folders',
            params: {
                ...(cursor !== undefined && { cursor }),
                page_size: 30
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'cursor',
                response_path: 'folders',
                limit_name_in_request: 'page_size',
                limit: 30,
                on_page: async ({ nextPageParam }) => {
                    cursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            processedAnyPage = true;

            const folders = z.array(ProviderFolderSchema).parse(page);

            const mapped = folders.map((folder) => ({
                id: folder.id,
                name: folder.name,
                parent_folder_id: folder.parent_folder_id
            }));

            if (mapped.length > 0) {
                await nango.batchSave(mapped, 'Folder');
            }

            await nango.saveCheckpoint({ cursor: cursor ?? '' });
        }

        if (processedAnyPage) {
            await nango.clearCheckpoint();
        }

        await nango.trackDeletesEnd('Folder');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
