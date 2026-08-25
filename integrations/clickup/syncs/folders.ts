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

const MetadataSchema = z.object({
    team_id: z.string()
});

const CheckpointSchema = z.object({
    spaceIndex: z.number().int().nonnegative(),
    spaceId: z.string(),
    spacesFingerprint: z.string()
});

const sync = createSync({
    description: 'Sync folders from ClickUp.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
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
        const metadata = await nango.getMetadata();
        if (!metadata?.team_id) {
            throw new Error('Missing required metadata: team_id');
        }
        const teamId = metadata.team_id;

        // Blocker: ClickUp folders endpoint has no updated_at filter or incremental
        // support. Full refresh with deletion detection is required.
        await nango.trackDeletesStart('Folder');

        const checkpointResult = CheckpointSchema.safeParse(await nango.getCheckpoint());
        const checkpoint = checkpointResult.success ? checkpointResult.data : undefined;

        // Get all spaces in the workspace
        // https://developer.clickup.com/reference/getspaces
        const spacesResponse = await nango.get({
            endpoint: `/api/v2/team/${encodeURIComponent(teamId)}/space`,
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

        const spacesFingerprint = JSON.stringify(spaces.map(({ id }) => id));
        let startIndex = 0;
        if (checkpoint && checkpoint.spacesFingerprint === spacesFingerprint) {
            if (checkpoint.spaceId !== '') {
                const resolvedIndex = spaces.findIndex(({ id }) => id === checkpoint.spaceId);
                startIndex = resolvedIndex >= 0 ? resolvedIndex : 0;
            } else if (checkpoint.spaceIndex <= spaces.length) {
                startIndex = checkpoint.spaceIndex;
            }
        }

        for (let i = startIndex; i < spaces.length; i++) {
            const space = spaces[i];
            if (!space) {
                throw new Error(`Unexpected undefined space at index ${i}`);
            }

            // https://developer.clickup.com/reference/getfolders
            const foldersResponse = await nango.get({
                endpoint: `/api/v2/space/${encodeURIComponent(space.id)}/folder`,
                params: { archived: 'false' },
                retries: 3
            });

            const rawFolders = foldersResponse.data.folders;
            if (!Array.isArray(rawFolders)) {
                throw new Error(`Invalid folders response for space ${space.id}: expected array`);
            }

            const spaceFolders: Array<{
                id: string;
                name: string;
                orderindex: number;
                overrideStatuses: boolean;
                hidden: boolean;
                spaceId: string;
            }> = [];

            for (const folder of rawFolders) {
                const parsed = FolderSchema.safeParse(folder);
                if (!parsed.success) {
                    throw new Error(`Failed to parse folder: ${JSON.stringify(parsed.error.issues)}`);
                }

                spaceFolders.push({
                    id: parsed.data.id,
                    name: parsed.data.name,
                    orderindex: parsed.data.orderindex,
                    overrideStatuses: parsed.data.override_statuses,
                    hidden: parsed.data.hidden,
                    spaceId: space.id
                });
            }

            if (spaceFolders.length > 0) {
                await nango.batchSave(spaceFolders, 'Folder');
            }

            // Persist forward progress even when a valid page is empty.
            const nextSpace = spaces[i + 1];
            await nango.saveCheckpoint({
                spaceIndex: i + 1,
                spaceId: nextSpace?.id ?? '',
                spacesFingerprint
            });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Folder');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
