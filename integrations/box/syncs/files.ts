import { createSync } from 'nango';
import { z } from 'zod';

const BoxDocumentSchema = z.object({
    id: z.string(),
    name: z.string(),
    download_url: z.string().optional(),
    modified_at: z.string()
});

type BoxDocument = z.infer<typeof BoxDocumentSchema>;

const MetadataSchema = z.object({
    files: z.array(z.string()),
    folders: z.array(z.string())
});

const ModelsSchema = {
    BoxDocument: BoxDocumentSchema
};

const EntryItemSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    modified_at: z.string().optional(),
    shared_link: z
        .object({
            download_url: z.string().optional()
        })
        .optional()
        .nullable()
});

type EntryItem = z.infer<typeof EntryItemSchema>;

const FileMetadataSchema = z.object({
    id: z.string(),
    name: z.string(),
    modified_at: z.string(),
    shared_link: z
        .object({
            download_url: z.string().optional()
        })
        .optional()
        .nullable()
});

const sync = createSync<typeof ModelsSchema, typeof MetadataSchema>({
    description: 'Sync the metadata of specified files or folder paths from Box. A file or folder ID can be provided.',
    version: '3.0.0',
    frequency: 'every day',
    autoStart: false,
    endpoints: [
        {
            method: 'GET',
            path: '/files',
            group: 'Files'
        }
    ],
    models: ModelsSchema,
    metadata: MetadataSchema,

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const files = metadata?.files ?? [];
        const folders = metadata?.folders ?? [];
        const batchSize = 100;

        if (files.length === 0 && folders.length === 0) {
            throw new Error('Metadata for files or folders is required.');
        }

        await nango.trackDeletesStart('BoxDocument');

        for (const folder of folders) {
            await fetchFolder(nango, folder);
        }

        let batch: BoxDocument[] = [];
        for (const fileId of files) {
            const fileData = await getFileMetadata(nango, fileId);
            batch.push({
                id: fileData.id,
                name: fileData.name,
                modified_at: fileData.modified_at,
                ...(fileData.shared_link?.download_url && { download_url: fileData.shared_link.download_url })
            });
            if (batch.length >= batchSize) {
                await nango.batchSave(batch, 'BoxDocument');
                batch = [];
            }
        }
        if (batch.length > 0) {
            await nango.batchSave(batch, 'BoxDocument');
        }

        await nango.trackDeletesEnd('BoxDocument');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

async function fetchFolder(nango: NangoSyncLocal, folderId: string) {
    let batch: BoxDocument[] = [];
    const batchSize = 100;

    for await (const items of nango.paginate<EntryItem>({
        // https://developer.box.com/reference/get-folders-id-items/
        endpoint: `/2.0/folders/${folderId}/items`,
        params: {
            fields: 'id,name,modified_at,shared_link'
        },
        paginate: {
            type: 'cursor',
            cursor_path_in_response: 'next_marker',
            limit_name_in_request: 'limit',
            cursor_name_in_request: 'marker',
            response_path: 'entries',
            limit: 100
        },
        retries: 10
    })) {
        for (const item of items) {
            if (item.type === 'folder') {
                await fetchFolder(nango, item.id);
            }
            if (item.type === 'file') {
                if (!item.shared_link) {
                    await nango.log(`Skipping file ${item.id} as it does not have a shared link`, { level: 'debug' });
                    continue;
                }

                batch.push({
                    id: item.id,
                    name: item.name,
                    modified_at: item.modified_at ?? '',
                    ...(item.shared_link?.download_url && { download_url: item.shared_link.download_url })
                });
                if (batch.length >= batchSize) {
                    await nango.batchSave(batch, 'BoxDocument');
                    batch = [];
                }
            }
        }
    }

    if (batch.length > 0) {
        await nango.batchSave(batch, 'BoxDocument');
    }
}

async function getFileMetadata(nango: NangoSyncLocal, fileId: string) {
    const response = await nango.get({
        // https://developer.box.com/reference/get-files-id/
        endpoint: `/2.0/files/${fileId}`,
        params: {
            fields: 'id,name,modified_at,shared_link'
        },
        retries: 10
    });
    return FileMetadataSchema.parse(response.data);
}
