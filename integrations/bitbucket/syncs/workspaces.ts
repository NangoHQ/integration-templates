import { createSync } from 'nango';
import { z } from 'zod';

const WorkspaceSchema = z.object({
    id: z.string(),
    slug: z.string().optional(),
    name: z.string().optional(),
    uuid: z.string().optional(),
    type: z.string().optional(),
    is_private: z.boolean().optional(),
    created_at: z.string().optional()
});

const RawWorkspaceAccessSchema = z.object({
    workspace: z
        .object({
            uuid: z.string(),
            slug: z.string().nullish(),
            name: z.string().nullish(),
            type: z.string().nullish(),
            is_private: z.boolean().nullish(),
            created_on: z.string().nullish()
        })
        .nullish()
});

const WorkspacesResponseSchema = z.object({
    values: z.array(RawWorkspaceAccessSchema),
    next: z.string().optional()
});

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync workspaces the authenticated user belongs to.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Workspace: WorkspaceSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/workspaces'
        }
    ],
    checkpoint: CheckpointSchema,

    exec: async (nango) => {
        await nango.trackDeletesStart('Workspace');

        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = checkpoint ? CheckpointSchema.safeParse(checkpoint) : null;
        let page = parsedCheckpoint?.success ? parsedCheckpoint.data.page : 1;

        while (true) {
            // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-workspaces/#api-user-workspaces-get
            const response = await nango.get({
                endpoint: '/2.0/user/workspaces',
                params: {
                    page,
                    pagelen: 100
                },
                retries: 3
            });

            const parsedResponse = WorkspacesResponseSchema.parse(response.data);
            const workspaces = [];
            for (const item of parsedResponse.values) {
                const parsed = RawWorkspaceAccessSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Invalid workspace access record: ${parsed.error.message}`);
                }

                const workspace = parsed.data.workspace;
                if (!workspace?.uuid) {
                    throw new Error('Workspace missing uuid');
                }

                workspaces.push({
                    id: workspace.uuid,
                    ...(workspace.slug != null && { slug: workspace.slug }),
                    ...(workspace.name != null && { name: workspace.name }),
                    ...(workspace.uuid != null && { uuid: workspace.uuid }),
                    ...(workspace.type != null && { type: workspace.type }),
                    ...(workspace.is_private != null && { is_private: workspace.is_private }),
                    ...(workspace.created_on != null && { created_at: workspace.created_on })
                });
            }

            if (workspaces.length > 0) {
                await nango.batchSave(workspaces, 'Workspace');
            }

            if (!parsedResponse.next) {
                await nango.trackDeletesEnd('Workspace');
                await nango.clearCheckpoint();
                return;
            }

            page += 1;
            await nango.saveCheckpoint({ page });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
