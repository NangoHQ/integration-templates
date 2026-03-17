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
    pageToken: z.string()
});

const SharedDriveApiSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    colorRgb: z.string().optional(),
    kind: z.string().optional(),
    backgroundImageLink: z.string().optional(),
    themeId: z.string().optional(),
    createdTime: z.string().optional(),
    hidden: z.boolean().optional()
});

const SharedDriveListResponseSchema = z.object({
    drives: z.array(SharedDriveApiSchema).optional(),
    nextPageToken: z.string().optional()
});

function parseOptional<T>(schema: z.ZodType<T>, value: unknown): T | undefined {
    const result = schema.safeParse(value);
    return result.success ? result.data : undefined;
}

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
        const checkpoint = parseOptional(CheckpointSchema, await nango.getCheckpoint());
        let pageToken = checkpoint?.pageToken || undefined;

        if (!pageToken) {
            await nango.trackDeletesStart('SharedDrive');
        }

        do {
            const params: Record<string, string> = {
                pageSize: '100'
            };

            if (pageToken) {
                params['pageToken'] = pageToken;
            }

            // https://developers.google.com/workspace/drive/api/reference/rest/v3/drives/list
            const response = await nango.get({
                endpoint: '/drive/v3/drives',
                params,
                retries: 3
            });

            const data = SharedDriveListResponseSchema.parse(response.data);
            const drives = (data.drives || []).map((drive) => ({
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

            pageToken = data.nextPageToken;
            await nango.saveCheckpoint({
                pageToken: pageToken || ''
            });
        } while (pageToken);

        await nango.trackDeletesEnd('SharedDrive');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
