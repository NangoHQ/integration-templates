import { createSync } from 'nango';
import { z } from 'zod';

const SharedFolderSchema = z.object({
    shared_folder_id: z.string(),
    shared_folder_name: z.string().optional(),
    is_team_folder: z.boolean().optional(),
    parent_shared_folder_id: z.string().optional(),
    shared_folder_path_lower: z.string().optional(),
    shared_folder_preview_path: z.string().optional(),
    access_type: z
        .object({
            '.tag': z.string()
        })
        .optional(),
    is_inside_team_folder: z.boolean().optional(),
    is_mount_managed: z.boolean().optional(),
    sync_settings: z
        .object({
            '.tag': z.string().optional()
        })
        .optional(),
    reader_channel_id: z.string().optional(),
    acl_update_policy: z
        .object({
            '.tag': z.string().optional()
        })
        .optional()
});

const ListFoldersResponseSchema = z.object({
    entries: z.array(SharedFolderSchema),
    cursor: z.string().optional(),
    has_more: z.boolean().optional()
});

const SharedFolderOutputSchema = z.object({
    id: z.string(),
    sharedFolderId: z.string(),
    sharedFolderName: z.string().optional(),
    isTeamFolder: z.boolean().optional(),
    parentSharedFolderId: z.string().optional(),
    sharedFolderPathLower: z.string().optional(),
    sharedFolderPreviewPath: z.string().optional(),
    accessType: z.string().optional(),
    isInsideTeamFolder: z.boolean().optional(),
    isMountManaged: z.boolean().optional(),
    aclUpdatePolicy: z.string().optional()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync shared folder metadata visible to the current Dropbox user.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/shared-folders'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        SharedFolder: SharedFolderOutputSchema
    },

    exec: async (nango) => {
        const checkpoint = z.object({ cursor: z.string().optional() }).parse((await nango.getCheckpoint()) ?? {});

        // Reset any stored cursor before a delete-tracked run to ensure all records are seen
        if (checkpoint.cursor) {
            await nango.clearCheckpoint();
        }

        let cursor: string | undefined = undefined;
        let hasMore = true;

        await nango.trackDeletesStart('SharedFolder');

        try {
            while (hasMore) {
                const response = cursor
                    ? await nango.post({
                          // https://www.dropbox.com/developers/documentation/http/documentation#sharing-list_folders-continue
                          endpoint: '/2/sharing/list_folders/continue',
                          data: {
                              cursor
                          },
                          retries: 3
                      })
                    : await nango.post({
                          // https://www.dropbox.com/developers/documentation/http/documentation#sharing-list_folders
                          endpoint: '/2/sharing/list_folders',
                          data: {
                              limit: 1000
                          },
                          retries: 3
                      });

                const parsed = ListFoldersResponseSchema.parse(response.data);

                if (parsed.entries.length > 0) {
                    const folders = parsed.entries.map((folder) => ({
                        id: folder.shared_folder_id,
                        sharedFolderId: folder.shared_folder_id,
                        ...(folder.shared_folder_name !== undefined && {
                            sharedFolderName: folder.shared_folder_name
                        }),
                        isTeamFolder: folder.is_team_folder,
                        parentSharedFolderId: folder.parent_shared_folder_id,
                        sharedFolderPathLower: folder.shared_folder_path_lower,
                        sharedFolderPreviewPath: folder.shared_folder_preview_path,
                        accessType: folder.access_type?.['.tag'],
                        isInsideTeamFolder: folder.is_inside_team_folder,
                        isMountManaged: folder.is_mount_managed,
                        aclUpdatePolicy: folder.acl_update_policy?.['.tag']
                    }));

                    await nango.batchSave(folders, 'SharedFolder');
                }

                cursor = parsed.cursor;
                hasMore = (parsed.has_more ?? false) && cursor !== undefined;

                if (cursor) {
                    await nango.saveCheckpoint({ cursor });
                }
            }

            await nango.clearCheckpoint();
        } finally {
            await nango.trackDeletesEnd('SharedFolder');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
