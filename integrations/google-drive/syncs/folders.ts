import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const FolderSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    createdTime: z.string().optional(),
    modifiedTime: z.string().optional()
});

const DriveFileSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    createdTime: z.string().optional(),
    modifiedTime: z.string().optional()
});

const DriveSchema = z.object({
    id: z.string()
});

const CheckpointSchema = z.object({
    phase: z.string(),
    myDriveNextPageToken: z.string(),
    drivesNextPageToken: z.string(),
    drives: z.string(),
    driveIndex: z.number(),
    driveFolderNextPageToken: z.string()
});

type Checkpoint = z.infer<typeof CheckpointSchema>;

function makeCheckpoint(partial: {
    phase: string;
    myDriveNextPageToken?: string;
    drivesNextPageToken?: string;
    drives?: string;
    driveIndex?: number;
    driveFolderNextPageToken?: string;
}): Checkpoint {
    return {
        phase: partial.phase,
        myDriveNextPageToken: partial.myDriveNextPageToken ?? '',
        drivesNextPageToken: partial.drivesNextPageToken ?? '',
        drives: partial.drives ?? '',
        driveIndex: partial.driveIndex ?? 0,
        driveFolderNextPageToken: partial.driveFolderNextPageToken ?? ''
    };
}

const sync = createSync({
    description: 'Sync root-level Google Drive folders from My Drive and shared drives',
    version: '3.0.1',
    endpoints: [{ method: 'POST', path: '/syncs/folders', group: 'Folders' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,

    models: {
        Folder: FolderSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint ?? makeCheckpoint({ phase: '' }));
        if (!parsedCheckpoint.success) {
            throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
        }
        const checkpoint = parsedCheckpoint.data;

        const phase: 'myDrive' | 'drives' | 'driveFolders' | undefined =
            checkpoint.phase === 'myDrive' || checkpoint.phase === 'drives' || checkpoint.phase === 'driveFolders' ? checkpoint.phase : undefined;

        let accumulatedDrives: Array<{ id: string }> = [];
        if (checkpoint.drives) {
            const parsed = z.array(DriveSchema).safeParse(JSON.parse(checkpoint.drives));
            if (!parsed.success) {
                throw new Error(`Invalid drives checkpoint: ${parsed.error.message}`);
            }
            accumulatedDrives = parsed.data;
        }

        await nango.trackDeletesStart('Folder');

        if (!phase || phase === 'myDrive') {
            let myDriveNextPageToken: string | undefined = checkpoint.myDriveNextPageToken || undefined;

            // Fetch root-level folders from My Drive
            // https://developers.google.com/drive/api/reference/rest/v3/files/list
            const myDriveConfig = {
                endpoint: '/drive/v3/files',
                params: {
                    q: "mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false",
                    fields: 'nextPageToken,files(id,name,createdTime,modifiedTime)',
                    corpora: 'user',
                    pageSize: '100',
                    ...(myDriveNextPageToken && { pageToken: myDriveNextPageToken })
                },
                paginate: {
                    type: 'cursor',
                    cursor_path_in_response: 'nextPageToken',
                    cursor_name_in_request: 'pageToken',
                    response_path: 'files',
                    limit: 100,
                    on_page: async ({ nextPageParam }) => {
                        myDriveNextPageToken = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                    }
                },
                retries: 3
            } satisfies ProxyConfiguration;

            for await (const batch of nango.paginate(myDriveConfig)) {
                const folders = batch.map((file) => {
                    const parsed = DriveFileSchema.parse(file);
                    return {
                        id: parsed.id,
                        name: parsed.name ?? undefined,
                        createdTime: parsed.createdTime ?? undefined,
                        modifiedTime: parsed.modifiedTime ?? undefined
                    };
                });

                if (folders.length > 0) {
                    await nango.batchSave(folders, 'Folder');
                }

                if (myDriveNextPageToken) {
                    await nango.saveCheckpoint(
                        makeCheckpoint({
                            phase: 'myDrive',
                            myDriveNextPageToken
                        })
                    );
                }
            }

            accumulatedDrives = [];
            await nango.saveCheckpoint(
                makeCheckpoint({
                    phase: 'drives',
                    drives: JSON.stringify(accumulatedDrives)
                })
            );
        }

        if (phase === 'drives') {
            let drivesNextPageToken: string | undefined = checkpoint.drivesNextPageToken || undefined;

            // Fetch shared drives first
            // https://developers.google.com/drive/api/reference/rest/v3/drives/list
            const drivesConfig = {
                endpoint: '/drive/v3/drives',
                params: {
                    fields: 'nextPageToken,drives(id)',
                    pageSize: '100',
                    ...(drivesNextPageToken && { pageToken: drivesNextPageToken })
                },
                paginate: {
                    type: 'cursor',
                    cursor_path_in_response: 'nextPageToken',
                    cursor_name_in_request: 'pageToken',
                    response_path: 'drives',
                    limit: 100,
                    on_page: async ({ nextPageParam }) => {
                        drivesNextPageToken = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                    }
                },
                retries: 3
            } satisfies ProxyConfiguration;

            for await (const batch of nango.paginate(drivesConfig)) {
                const pageDrives = batch.map((drive) => {
                    const parsed = DriveSchema.parse(drive);
                    return { id: parsed.id };
                });
                accumulatedDrives.push(...pageDrives);

                if (drivesNextPageToken) {
                    await nango.saveCheckpoint(
                        makeCheckpoint({
                            phase: 'drives',
                            drivesNextPageToken,
                            drives: JSON.stringify(accumulatedDrives)
                        })
                    );
                }
            }

            await nango.saveCheckpoint(
                makeCheckpoint({
                    phase: 'driveFolders',
                    drives: JSON.stringify(accumulatedDrives),
                    driveIndex: 0
                })
            );
        }

        if (phase === 'driveFolders') {
            let driveIndex = checkpoint.driveIndex;

            // Fetch root-level folders from each shared drive
            for (; driveIndex < accumulatedDrives.length; driveIndex++) {
                const drive = accumulatedDrives[driveIndex];
                if (!drive) {
                    throw new Error(`Drive at index ${driveIndex} is missing`);
                }

                let driveFolderNextPageToken: string | undefined =
                    driveIndex === checkpoint.driveIndex ? checkpoint.driveFolderNextPageToken || undefined : undefined;

                const driveFoldersConfig = {
                    endpoint: '/drive/v3/files',
                    params: {
                        q: `mimeType='application/vnd.google-apps.folder' and '${drive.id}' in parents and trashed=false`,
                        fields: 'nextPageToken,files(id,name,createdTime,modifiedTime)',
                        corpora: 'drive',
                        driveId: drive.id,
                        includeItemsFromAllDrives: 'true',
                        supportsAllDrives: 'true',
                        pageSize: '100',
                        ...(driveFolderNextPageToken && { pageToken: driveFolderNextPageToken })
                    },
                    paginate: {
                        type: 'cursor',
                        cursor_path_in_response: 'nextPageToken',
                        cursor_name_in_request: 'pageToken',
                        response_path: 'files',
                        limit: 100,
                        on_page: async ({ nextPageParam }) => {
                            driveFolderNextPageToken = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                        }
                    },
                    retries: 3
                } satisfies ProxyConfiguration;

                for await (const batch of nango.paginate(driveFoldersConfig)) {
                    const folders = batch.map((file) => {
                        const parsed = DriveFileSchema.parse(file);
                        return {
                            id: parsed.id,
                            name: parsed.name ?? undefined,
                            createdTime: parsed.createdTime ?? undefined,
                            modifiedTime: parsed.modifiedTime ?? undefined
                        };
                    });

                    if (folders.length > 0) {
                        await nango.batchSave(folders, 'Folder');
                    }

                    if (driveFolderNextPageToken) {
                        await nango.saveCheckpoint(
                            makeCheckpoint({
                                phase: 'driveFolders',
                                drives: JSON.stringify(accumulatedDrives),
                                driveIndex,
                                driveFolderNextPageToken
                            })
                        );
                    } else {
                        await nango.saveCheckpoint(
                            makeCheckpoint({
                                phase: 'driveFolders',
                                drives: JSON.stringify(accumulatedDrives),
                                driveIndex: driveIndex + 1
                            })
                        );
                    }
                }
            }

            await nango.clearCheckpoint();
            await nango.trackDeletesEnd('Folder');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
