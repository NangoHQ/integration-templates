import { createSync } from 'nango';
import { z } from 'zod';

// Normalized model for sync output
const BaseSchema = z.object({
    id: z.string(),
    name: z.string(),
    permission_level: z.enum(['create', 'edit', 'read']).optional()
});

const CheckpointSchema = z.object({
    offset: z.string()
});

type BasesCheckpoint = z.infer<typeof CheckpointSchema>;

const sync = createSync({
    description: 'Sync Airtable bases visible to the authenticated user',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ path: '/syncs/bases', method: 'GET' }],
    checkpoint: CheckpointSchema,
    models: {
        Base: BaseSchema
    },

    exec: async (nango) => {
        // Blocker: The Airtable List Bases API (/v0/meta/bases) does not support
        // modified_since, updated_at, or any change-based filtering. It always
        // returns the complete list of bases visible to the user. Therefore,
        // we use full refresh with deletion tracking.
        await nango.trackDeletesStart('Base');

        const checkpoint = (await nango.getCheckpoint()) as BasesCheckpoint | null;
        const offset: string | undefined = checkpoint?.offset;
        let nextOffset = offset;

        // https://airtable.com/developers/web/api/list-bases
        // The List Bases endpoint uses offset-based pagination where offset is a string token
        const proxyConfig = {
            endpoint: '/v0/meta/bases',
            paginate: {
                type: 'cursor' as const,
                cursor_name_in_request: 'offset',
                cursor_path_in_response: 'offset',
                response_path: 'bases',
                ...(offset && { cursor_start_value: offset }),
                on_page: async ({ nextPageParam }: { nextPageParam?: string | number | undefined }) => {
                    nextOffset = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate<{
            id: string;
            name: string;
            permissionLevel?: 'create' | 'edit' | 'read';
        }>(proxyConfig)) {
            const bases = page.map((record) => ({
                id: record.id,
                name: record.name,
                ...(record.permissionLevel && { permission_level: record.permissionLevel })
            }));

            if (bases.length > 0) {
                await nango.batchSave(bases, 'Base');
            }

            if (nextOffset) {
                await nango.saveCheckpoint({ offset: nextOffset });
            }
        }

        await nango.trackDeletesEnd('Base');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
