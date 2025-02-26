import type { BoxDocument, BoxMetadata, NangoSync, ProxyConfiguration } from '../../models';
import type { BoxFile, ListFolderItemsResponse } from '../types.js';

export default async function fetchData(nango: NangoSync) {
    const metadata = await nango.getMetadata<BoxMetadata>();
    const files = metadata?.files ?? [];
    const folders = metadata?.folders ?? [];
    const batchSize = 100;

    if (files.length === 0 && folders.length === 0) {
        throw new Error('Metadata for files or folders is required.');
    }

    for (const folder of folders) {
        await fetchFolder(nango, folder);
    }

    let batch: BoxDocument[] = [];
    for (const file of files) {
        const metadata = await getFileMetadata(nango, file);
        batch.push({
            id: metadata.id,
            name: metadata.name,
            modified_at: metadata.modified_at,
            download_url: metadata.shared_link?.download_url,
            field_id: metadata.id
        });
        if (batch.length >= batchSize) {
            await nango.batchSave(batch, 'BoxDocument');
            batch = [];
        }
    }
    if (batch.length > 0) {
        await nango.batchSave(batch, 'BoxDocument');
    }
}

async function fetchFolder(nango: NangoSync, folderId: string) {
    const proxy: ProxyConfiguration = {
        // https://developer.box.com/reference/get-folders-id-items/
        endpoint: `/2.0/folders/${folderId}/items`,
        params: {
            userMarker: 'true',
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
    };
    let batch: BoxDocument[] = [];
    const batchSize = 100;

    const response = await nango.get<ListFolderItemsResponse>(proxy);
    const items = response.data.entries;
    for (const item of items) {
        if (item.type === 'folder') {
            await fetchFolder(nango, item.id);
        }
        if (item.type === 'file') {
            if (!item.shared_link) {
                await nango.log(`Skipping file ${item.id} as it does not have a shared link`, { level: 'debug' });
                continue;
            }

            await nango.log(`Processing file ${item.id}`, { level: 'debug' });
            batch.push({
                id: item.id,
                name: item.name,
                modified_at: item.modified_at,
                download_url: item.shared_link?.download_url,
                field_id: item.id
            });
            if (batch.length >= batchSize) {
                await nango.log(`Saving ${batch.length} files`, { level: 'debug' });
                await nango.batchSave(batch, 'BoxDocument');
                batch = [];
            }
        }
    }
    if (batch.length > 0) {
        await nango.log(`Saving ${batch.length} files`, { level: 'debug' });
        await nango.batchSave(batch, 'BoxDocument');
    }
}

async function getFileMetadata(nango: NangoSync, fileId: string) {
    const proxy: ProxyConfiguration = {
        // https://developer.box.com/reference/get-files-id/
        endpoint: `/2.0/files/${fileId}`,
        params: {
            fields: 'id,name,modified_at,shared_link'
        },
        retries: 10
    };
    const response = await nango.get<BoxFile>(proxy);
    return response.data;
}
