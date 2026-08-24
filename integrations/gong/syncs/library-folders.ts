import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const LibraryFolderSchema = z.object({
    id: z.string(),
    name: z.string().nullish(),
    parentFolderId: z.string().nullish(),
    createdBy: z.string().nullish(),
    updated: z.string().nullish()
});

const LibraryFolderProviderSchema = z.object({
    id: z.string().optional(),
    name: z.string().nullish(),
    parentFolderId: z.string().nullish(),
    createdBy: z.string().nullish(),
    updated: z.string().nullish()
});

function isUnavailableError(error: unknown): boolean {
    if (error === null || typeof error !== 'object') {
        return false;
    }
    if ('status' in error && (error.status === 401 || error.status === 404)) {
        return true;
    }
    if ('response' in error && error.response !== null && typeof error.response === 'object') {
        const response = error.response;
        if ('status' in response && (response.status === 401 || response.status === 404)) {
            return true;
        }
    }
    return false;
}

const sync = createSync({
    description: 'Sync Gong library folders',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    models: {
        LibraryFolder: LibraryFolderSchema
    },
    endpoints: [
        {
            path: '/syncs/library-folders',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        // Blocker: provider only exposes /v2/library/folders with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor. Run as full refresh.
        await nango.trackDeletesStart('LibraryFolder');

        const proxyConfig: ProxyConfiguration = {
            // https://help.gong.io/docs/what-the-gong-api-provides
            endpoint: '/v2/library/folders',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'records.cursor',
                response_path: 'folders',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        // @allowTryCatch 401/404 from plan-gated or scope-missing endpoint is a valid empty result
        try {
            for await (const page of nango.paginate(proxyConfig)) {
                const folders = [];
                for (const item of page) {
                    const parsed = LibraryFolderProviderSchema.safeParse(item);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse library folder: ${parsed.error.message}`);
                    }
                    const folder = parsed.data;
                    if (!folder.id) {
                        throw new Error('Library folder id is missing');
                    }
                    folders.push({
                        id: folder.id,
                        ...(folder.name != null && { name: folder.name }),
                        ...(folder.parentFolderId != null && { parentFolderId: folder.parentFolderId }),
                        ...(folder.createdBy != null && { createdBy: folder.createdBy }),
                        ...(folder.updated != null && { updated: folder.updated })
                    });
                }
                if (folders.length > 0) {
                    await nango.batchSave(folders, 'LibraryFolder');
                }
            }
            // Only mark deletes complete after a full successful enumeration
            await nango.trackDeletesEnd('LibraryFolder');
        } catch (error) {
            if (!isUnavailableError(error)) {
                throw error;
            }
            // 401/404: endpoint unavailable — leave delete tracking open so existing records are preserved
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
