import type { Folder, NangoSync, ProxyConfiguration } from '../../models';
import type { BoxEntryItem } from '../types.js';

export default async function fetchData(nango: NangoSync) {
    const proxy: ProxyConfiguration = {
        // https://developer.box.com/reference/get-folders-id-items/
        endpoint: `/2.0/folders/0/items`,
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

    for await (const items of nango.paginate<BoxEntryItem>(proxy)) {
        const folders = items.filter((item: BoxEntryItem) => item.type === 'folder');
        const savedFolders: Folder[] = folders.map((folder: BoxEntryItem) => ({
            id: folder.id,
            name: folder.name,
            modified_at: folder.modified_at
        }));

        await nango.batchSave(savedFolders, 'Folder');
    }
}
