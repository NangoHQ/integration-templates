import { createSync } from 'nango';
import { z } from 'zod';

const SharedDriveSchema = z.object({
    id: z.string(),
    name: z.string(),
    colorRgb: z.string().optional(),
    kind: z.string().optional(),
    backgroundImageLink: z.string().optional(),
    themeId: z.string().optional(),
    createdTime: z.string().optional(),
    hidden: z.boolean().optional()
});

const CheckpointSchema = z.object({
    page_token: z.string(),
    delete_tracking_started: z.boolean()
});

type Checkpoint = z.infer<typeof CheckpointSchema>;

const sync = createSync({
    description: 'Sync shared drives from Google Drive',
    version: '1.0.0',
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/sync-shared-drives',
            group: 'Shared Drives'
        }
    ],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,

    models: {
        SharedDrive: SharedDriveSchema
    },

    exec: async (nango) => {
        const checkpoint = (await nango.getCheckpoint()) as Checkpoint | null;
        let pageToken = checkpoint?.page_token || undefined;

        if (!checkpoint?.delete_tracking_started) {
            await nango.trackDeletesStart('SharedDrive');
            await nango.saveCheckpoint({
                page_token: pageToken ?? '',
                delete_tracking_started: true
            });
        }

        while (true) {
            const response = await nango.get<{
                drives?: Array<{
                    id?: string;
                    name?: string;
                    colorRgb?: string;
                    kind?: string;
                    backgroundImageLink?: string;
                    themeId?: string;
                    createdTime?: string;
                    hidden?: boolean;
                }>;
                nextPageToken?: string;
            }>({
                // https://developers.google.com/workspace/drive/api/reference/rest/v3/drives/list
                endpoint: '/drive/v3/drives',
                params: {
                    pageSize: '100',
                    ...(pageToken && { pageToken })
                },
                retries: 3
            });

            const drives = (response.data.drives ?? []).map((drive) => ({
                id: drive.id || '',
                name: drive.name || '',
                colorRgb: drive.colorRgb,
                kind: drive.kind,
                backgroundImageLink: drive.backgroundImageLink,
                themeId: drive.themeId,
                createdTime: drive.createdTime,
                hidden: drive.hidden
            }));

            if (drives.length > 0) {
                await nango.batchSave(drives, 'SharedDrive');
            }

            const nextPageToken = response.data.nextPageToken;
            if (nextPageToken) {
                pageToken = nextPageToken;
                await nango.saveCheckpoint({
                    page_token: pageToken,
                    delete_tracking_started: true
                });
                continue;
            }

            break;
        }

        await nango.trackDeletesEnd('SharedDrive');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
