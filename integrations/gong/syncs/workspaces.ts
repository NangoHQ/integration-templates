import { createSync } from 'nango';
import { z } from 'zod';

const WorkspaceSchema = z.object({
    id: z.string(),
    name: z.string().nullish(),
    description: z.string().nullish()
});

const ProviderResponseSchema = z.object({
    requestId: z.string().optional(),
    workspaces: z
        .array(
            z.object({
                id: z.string().nullable(),
                name: z.string().nullish(),
                description: z.string().nullish()
            })
        )
        .nullish()
});

const sync = createSync({
    description: 'Sync workspaces from Gong.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Workspace: WorkspaceSchema
    },
    endpoints: [
        {
            path: '/syncs/workspaces',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        // Blocker: provider only exposes /v2/workspaces with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor.

        // https://help.gong.io/docs/what-the-gong-api-provides
        const response = await nango.get({
            endpoint: '/v2/workspaces',
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse workspaces response: ${parsed.error.message}`);
        }

        const workspaces = parsed.data.workspaces ?? [];
        const records = workspaces.map((workspace) => {
            if (!workspace.id) {
                throw new Error('Expected workspace id to be non-null');
            }

            return {
                id: workspace.id,
                ...(workspace.name !== undefined && { name: workspace.name }),
                ...(workspace.description !== undefined && { description: workspace.description })
            };
        });

        // Start delete tracking only after response and record identity validation succeeds
        // so failures do not mark valid records as deleted.
        await nango.trackDeletesStart('Workspace');

        if (records.length > 0) {
            await nango.batchSave(records, 'Workspace');
        }

        await nango.trackDeletesEnd('Workspace');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
