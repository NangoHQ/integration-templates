import { createSync } from 'nango';
import { z } from 'zod';

const FolderSchema = z.object({
    id: z.string(),
    name: z.string(),
    orderindex: z.number(),
    override_statuses: z.boolean(),
    hidden: z.boolean()
});

const SyncFolderSchema = z.object({
    id: z.string(),
    name: z.string(),
    orderindex: z.number(),
    overrideStatuses: z.boolean(),
    hidden: z.boolean(),
    spaceId: z.string()
});

const sync = createSync({
    description: 'Sync folders from ClickUp.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Folder: SyncFolderSchema
    },
    endpoints: [
        {
            path: '/syncs/folders',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        // Blocker: ClickUp folders endpoint has no updated_at filter or incremental
        // support. Full refresh with deletion detection is required.
        await nango.trackDeletesStart('Folder');

        // Get all spaces in the workspace
        // https://developer.clickup.com/reference/getspaces
        const spacesResponse = await nango.get({
            endpoint: `/api/v2/team/${encodeURIComponent('90152560096')}/space`,
            retries: 3
        });

        const rawSpaces = spacesResponse.data.spaces;
        if (!Array.isArray(rawSpaces)) {
            throw new Error('Invalid spaces response: expected array');
        }

        const spaces = rawSpaces.map((space: unknown) => {
            if (typeof space !== 'object' || space === null) {
                throw new Error('Invalid space object');
            }
            if (!('id' in space) || typeof space.id !== 'string') {
                throw new Error('Invalid space id');
            }
            return { id: space.id };
        });

        // Fetch folders for each space
        const allFolders: Array<{
            id: string;
            name: string;
            orderindex: number;
            overrideStatuses: boolean;
            hidden: boolean;
            spaceId: string;
        }> = [];

        for (const space of spaces) {
            // https://developer.clickup.com/reference/getfolders
            const foldersResponse = await nango.get({
                endpoint: `/api/v2/space/${encodeURIComponent(space.id)}/folder`,
                params: { archived: 'false' },
                retries: 3
            });

            const rawFolders = foldersResponse.data.folders;
            if (!Array.isArray(rawFolders)) {
                continue;
            }

            for (const folder of rawFolders) {
                const parsed = FolderSchema.safeParse(folder);
                if (!parsed.success) {
                    throw new Error(`Failed to parse folder: ${JSON.stringify(parsed.error.issues)}`);
                }

                allFolders.push({
                    id: parsed.data.id,
                    name: parsed.data.name,
                    orderindex: parsed.data.orderindex,
                    overrideStatuses: parsed.data.override_statuses,
                    hidden: parsed.data.hidden,
                    spaceId: space.id
                });
            }
        }

        if (allFolders.length > 0) {
            await nango.batchSave(allFolders, 'Folder');
        }

        await nango.trackDeletesEnd('Folder');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
