import { createSync } from 'nango';
import { z } from 'zod';

const PermissionSchema = z.object({
    id: z.string(),
    file_id: z.string(),
    permission_id: z.string(),
    type: z.string(),
    role: z.string(),
    display_name: z.union([z.string(), z.null()]),
    email_address: z.union([z.string(), z.null()]),
    domain: z.union([z.string(), z.null()]),
    allow_file_discovery: z.union([z.boolean(), z.null()]),
    deleted: z.union([z.boolean(), z.null()])
});

const CheckpointSchema = z.object({
    file_page_token: z.string(),
    current_file_id: z.string(),
    permission_page_token: z.string(),
    delete_tracking_started: z.boolean()
});

type Checkpoint = z.infer<typeof CheckpointSchema>;

const sync = createSync({
    description: 'Sync file permissions from Google Drive',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/sync-permissions', group: 'Permissions' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,

    models: {
        Permission: PermissionSchema
    },

    exec: async (nango) => {
        const checkpoint = (await nango.getCheckpoint()) as Checkpoint | null;
        let filePageToken = checkpoint?.file_page_token || undefined;
        const resumeFileId = checkpoint?.current_file_id || '';
        const resumePermissionPageToken = checkpoint?.permission_page_token || '';

        if (!checkpoint?.delete_tracking_started) {
            await nango.trackDeletesStart('Permission');
            await nango.saveCheckpoint({
                file_page_token: filePageToken ?? '',
                current_file_id: resumeFileId,
                permission_page_token: resumePermissionPageToken,
                delete_tracking_started: true
            });
        }

        let shouldResumeCurrentFile = resumeFileId !== '';

        while (true) {
            const currentFilesPageToken = filePageToken ?? '';
            const filesResponse = await nango.get<{
                files?: Array<{ id: string }>;
                nextPageToken?: string;
            }>({
                // https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list
                endpoint: '/drive/v3/files',
                params: {
                    fields: 'nextPageToken,files(id)',
                    pageSize: '100',
                    supportsAllDrives: 'true',
                    includeItemsFromAllDrives: 'true',
                    ...(filePageToken && { pageToken: filePageToken })
                },
                retries: 3
            });

            const files = filesResponse.data.files ?? [];
            if (files.length === 0 && !filesResponse.data.nextPageToken) {
                break;
            }

            let startIndex = 0;
            if (shouldResumeCurrentFile) {
                const resumedFileIndex = files.findIndex((file) => file.id === resumeFileId);
                if (resumedFileIndex >= 0) {
                    startIndex = resumedFileIndex;
                }
                shouldResumeCurrentFile = false;
            }

            for (let index = startIndex; index < files.length; index++) {
                const fileId = files[index]!.id;
                let permissionPageToken = fileId === resumeFileId ? resumePermissionPageToken || undefined : undefined;

                while (true) {
                    const permissionsResponse = await nango.get<{
                        permissions?: Array<{
                            id: string;
                            type: string;
                            role: string;
                            displayName?: string;
                            emailAddress?: string;
                            domain?: string;
                            allowFileDiscovery?: boolean;
                            deleted?: boolean;
                        }>;
                        nextPageToken?: string;
                    }>({
                        // https://developers.google.com/workspace/drive/api/reference/rest/v3/permissions/list
                        endpoint: `/drive/v3/files/${fileId}/permissions`,
                        params: {
                            fields: 'nextPageToken,permissions(id,type,role,displayName,emailAddress,domain,allowFileDiscovery,deleted)',
                            supportsAllDrives: 'true',
                            pageSize: '100',
                            ...(permissionPageToken && { pageToken: permissionPageToken })
                        },
                        retries: 3
                    });

                    const permissions = (permissionsResponse.data.permissions ?? []).map((permission) => ({
                        id: `${fileId}_${permission.id}`,
                        file_id: fileId,
                        permission_id: permission.id,
                        type: permission.type,
                        role: permission.role,
                        display_name: permission.displayName ?? null,
                        email_address: permission.emailAddress ?? null,
                        domain: permission.domain ?? null,
                        allow_file_discovery: permission.allowFileDiscovery ?? null,
                        deleted: permission.deleted ?? null
                    }));

                    if (permissions.length > 0) {
                        await nango.batchSave(permissions, 'Permission');
                    }

                    const nextPermissionPageToken = permissionsResponse.data.nextPageToken;
                    if (nextPermissionPageToken) {
                        permissionPageToken = nextPermissionPageToken;
                        await nango.saveCheckpoint({
                            file_page_token: currentFilesPageToken,
                            current_file_id: fileId,
                            permission_page_token: permissionPageToken,
                            delete_tracking_started: true
                        });
                        continue;
                    }

                    break;
                }
            }

            const nextFilePageToken = filesResponse.data.nextPageToken;
            if (nextFilePageToken) {
                filePageToken = nextFilePageToken;
                await nango.saveCheckpoint({
                    file_page_token: filePageToken,
                    current_file_id: '',
                    permission_page_token: '',
                    delete_tracking_started: true
                });
                continue;
            }

            break;
        }

        await nango.trackDeletesEnd('Permission');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
