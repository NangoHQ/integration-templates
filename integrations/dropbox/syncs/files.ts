import type { NangoSync, ProxyConfiguration, DocumentMetadata, Document } from '../../models';
import type { DropboxFile, DropboxFileList } from '../types';

const batchSize = 100;

export default async function fetchData(nango: NangoSync): Promise<void> {
    const metadata = await nango.getMetadata<DocumentMetadata>();

    if (!metadata || (!metadata.files && !metadata.folders)) {
        throw new Error('Metadata for files or folders is required.');
    }

    const folders = metadata?.folders ? [...metadata.folders] : [];
    const files = metadata?.files ? [...metadata.files] : [];

    for (const folder of folders) {
        await fetchFolder(nango, folder);
    }

    const batch: Document[] = [];
    for (const file of files) {
        const metadata = await fetchFile(nango, file);
        batch.push(metadata);

        if (batch.length >= batchSize) {
            await nango.batchSave(batch, 'Document');
            batch.length = 0;
        }
    }

    if (batch.length) {
        await nango.batchSave(batch, 'Document');
    }
}

async function fetchFolder(nango: NangoSync, path: string): Promise<void> {
    const config: ProxyConfiguration = {
        // https://www.dropbox.com/developers/documentation/http/documentation#files-list_folder
        endpoint: `/2/files/list_folder`,
        retries: 10,
        data: {
            path,
            limit: 100,
            recursive: true,
            include_mounted_folders: true,
            include_non_downloadable_files: false
        }
    };

    let hasMore = true;
    let cursor: string | undefined;
    let batch: Document[] = [];

    do {
        const response = await nango.post<DropboxFileList>(cursor ? {
            // https://www.dropbox.com/developers/documentation/http/documentation#files-list_folder-continue
            endpoint: `/2/files/list_folder/continue`,
            retries: 10,
            data: { cursor }
        } : config);

        const { entries, has_more, cursor: newCursor } = response.data;
        cursor = newCursor;
        hasMore = has_more;

        const files = entries.filter((entry: DropboxFile) => entry['.tag'] === 'file');
        const fileMetadata = files.map((file: DropboxFile) => {
            return {
                id: file.id || file.path_lower,
                title: file.name,
                path: file.path_lower
            };
        });

        batch = batch.concat(fileMetadata);

        if (batch.length >= batchSize) {
            await nango.batchSave(batch, 'Document');
            batch = [];
        }
    } while (hasMore);

    if (batch.length) {
        await nango.batchSave(batch, 'Document');
    }
}

async function fetchFile(nango: NangoSync, path: string): Promise<Document> {
    const config: ProxyConfiguration = {
        // https://www.dropbox.com/developers/documentation/http/documentation#files-get_metadata
        endpoint: '/2/files/get_metadata',
        retries: 10,
        data: {
            path
        }
    };

    const response = await nango.post<DropboxFile>(config);

    const { data } = response;

    const fileMetadata: Document = {
        id: data.id || data.path_lower,
        title: data.name,
        path: data.path_lower
    };

    return fileMetadata;

}
