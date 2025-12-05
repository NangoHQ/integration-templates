import { createSync } from 'nango';
import type { BoxEntryItem } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { Folder } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Sync the folders at the root level from Box',
    version: '2.0.0',
    frequency: 'every day',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/root-folders',
            group: 'Folders'
        }
    ],

    models: {
        Folder: Folder
    },

    metadata: z.object({}),

    exec: async (nango) => {
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
                modified_at: folder.modified_at,
                url: folder.shared_link?.download_url || null
            }));

            await nango.batchSave(savedFolders, 'Folder');
        }

        await nango.deleteRecordsFromPreviousExecutions('Folder');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
