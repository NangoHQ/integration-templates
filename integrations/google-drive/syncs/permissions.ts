import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const PermissionSchema = z.object({
    id: z.string(),
    fileId: z.string(),
    permissionId: z.string(),
    type: z.string(),
    role: z.string(),
    displayName: z.string().optional(),
    emailAddress: z.string().optional(),
    domain: z.string().optional(),
    allowFileDiscovery: z.boolean().optional(),
    deleted: z.boolean().optional()
});

const CheckpointSchema = z.object({
    currentFileId: z.string(),
    permissionPageToken: z.string()
});

const FileApiSchema = z.object({
    id: z.string()
});

const PermissionApiSchema = z.object({
    id: z.string(),
    type: z.string(),
    role: z.string(),
    displayName: z.string().optional(),
    emailAddress: z.string().optional(),
    domain: z.string().optional(),
    allowFileDiscovery: z.boolean().optional(),
    deleted: z.boolean().optional()
});

const PermissionListResponseSchema = z.object({
    permissions: z.array(PermissionApiSchema).optional(),
    nextPageToken: z.string().optional()
});

function parseOptional<T>(schema: z.ZodType<T>, value: unknown): T | undefined {
    const result = schema.safeParse(value);
    return result.success ? result.data : undefined;
}

const sync = createSync({
    description: 'Sync file permissions from Google Drive',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/permissions', group: 'Permissions' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,

    models: {
        Permission: PermissionSchema
    },

    exec: async (nango) => {
        const checkpoint = parseOptional(CheckpointSchema, await nango.getCheckpoint());
        let currentFileId = checkpoint?.currentFileId || undefined;
        let permissionPageToken = checkpoint?.permissionPageToken || undefined;
        let resumeTargetFound = !currentFileId;

        if (!currentFileId && !permissionPageToken) {
            await nango.trackDeletesStart('Permission');
        }

        // First, get all files
        const filesConfig: ProxyConfiguration = {
            // https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list
            endpoint: '/drive/v3/files',
            params: {
                fields: 'nextPageToken,files(id,name,modifiedTime)',
                pageSize: '100'
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'nextPageToken',
                cursor_name_in_request: 'pageToken',
                response_path: 'files',
                limit: 100
            },
            retries: 3
        };

        // Fetch all files and their permissions
        for await (const filesBatch of nango.paginate(filesConfig)) {
            const files = z.array(FileApiSchema).parse(filesBatch);

            for (const file of files) {
                const fileId = file.id;

                if (currentFileId && !resumeTargetFound) {
                    if (fileId !== currentFileId) {
                        continue;
                    }

                    resumeTargetFound = true;

                    if (!permissionPageToken) {
                        currentFileId = undefined;
                        continue;
                    }
                }

                let nextPermissionPageToken = fileId === currentFileId ? permissionPageToken : undefined;

                // Fetch permissions for this file
                do {
                    const permissionsParams: Record<string, string> = {
                        fields: 'nextPageToken,permissions(id,type,role,displayName,emailAddress,domain,allowFileDiscovery,deleted)',
                        supportsAllDrives: 'true',
                        pageSize: '100',
                        maxSize: '100'
                    };

                    if (nextPermissionPageToken) {
                        permissionsParams['pageToken'] = nextPermissionPageToken;
                    }

                    // https://developers.google.com/workspace/drive/api/reference/rest/v3/permissions/list
                    const permissionsResponse = await nango.get({
                        endpoint: `/drive/v3/files/${fileId}/permissions`,
                        params: permissionsParams,
                        retries: 3
                    });

                    const permissionsData = PermissionListResponseSchema.parse(permissionsResponse.data);
                    const permissions = (permissionsData.permissions || []).map((perm) => ({
                        id: `${fileId}_${perm.id}`,
                        fileId: fileId,
                        permissionId: perm.id,
                        type: perm.type,
                        role: perm.role,
                        displayName: perm.displayName ?? undefined,
                        emailAddress: perm.emailAddress ?? undefined,
                        domain: perm.domain ?? undefined,
                        allowFileDiscovery: perm.allowFileDiscovery ?? undefined,
                        deleted: perm.deleted ?? undefined
                    }));

                    if (permissions.length > 0) {
                        await nango.batchSave(permissions, 'Permission');
                    }

                    nextPermissionPageToken = permissionsData.nextPageToken;

                    if (nextPermissionPageToken) {
                        await nango.saveCheckpoint({
                            currentFileId: fileId,
                            permissionPageToken: nextPermissionPageToken
                        });
                    }
                } while (nextPermissionPageToken);

                await nango.saveCheckpoint({
                    currentFileId: fileId,
                    permissionPageToken: ''
                });

                currentFileId = undefined;
                permissionPageToken = undefined;
            }
        }

        if (!resumeTargetFound) {
            await nango.log(`Checkpoint file ${checkpoint?.currentFileId} was not found. Restarting from the beginning on the next run.`);
        }

        await nango.saveCheckpoint({
            currentFileId: '',
            permissionPageToken: ''
        });
        await nango.trackDeletesEnd('Permission');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
