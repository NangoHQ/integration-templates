import type { NangoSync, ProxyConfiguration } from '../../models';
import type { DropboxFile, DropboxFileList } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: ProxyConfiguration = {
        // https://www.dropbox.com/developers/documentation/http/documentation#files-list_folder
        endpoint: `/2/files/list_folder`,
        retries: 10,
        data: {
            path: '',
            limit: 100,
            include_mounted_folders: true,
            include_non_downloadable_files: false,
            recursive: true
        }
    };

    const { data } = await nango.post<DropboxFileList>(config);
    const { entries } = data;

    let hasMore = data.has_more;
    let cursor = data.cursor;

    const files = entries.map((entry: DropboxFile) => {
        return {
            id: entry.id,
            path: entry.path_lower,
            title: entry.name
        };
    });

    await nango.batchSave(files, 'Document');

    while (hasMore) {
        const config: ProxyConfiguration = {
            // https://www.dropbox.com/developers/documentation/http/documentation#sharing-list_folders-continue
            endpoint: `/2/files/list_folder/continue`,
            retries: 10,
            data: {
                cursor
            }
        };

        const { data } = await nango.post<DropboxFileList>(config);
        const { entries } = data;

        hasMore = data.has_more;
        cursor = data.cursor;

        const files = entries.map((entry: DropboxFile) => {
            return {
                id: entry.id,
                path: entry.path_lower,
                title: entry.name
            };
        });

        await nango.batchSave(files, 'Document');
    }
}
