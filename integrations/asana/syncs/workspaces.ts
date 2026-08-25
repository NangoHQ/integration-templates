import { createSync, ProxyConfiguration } from 'nango';
import { z } from 'zod';

const WorkspaceSchema = z.object({
    id: z.string(),
    gid: z.string(),
    name: z.string().optional(),
    is_organization: z.boolean().optional(),
    email_domains: z.array(z.string()).optional(),
    resource_type: z.string().optional()
});

const AsanaWorkspaceSchema = z.object({
    gid: z.string(),
    name: z.string().nullish(),
    is_organization: z.boolean().nullish(),
    email_domains: z.array(z.string()).nullish(),
    resource_type: z.string().nullish()
});

const CheckpointSchema = z.object({
    offset: z.string()
});

const LoadedCheckpointSchema = z.object({
    offset: z.string().optional()
});

const sync = createSync({
    description: 'Sync workspaces visible to the authenticated Asana user.',
    version: '3.0.1',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',
    endpoints: [{ method: 'POST', path: '/syncs/workspaces' }],
    checkpoint: CheckpointSchema,
    models: {
        Workspace: WorkspaceSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = LoadedCheckpointSchema.safeParse(rawCheckpoint ?? {});
        const checkpoint = checkpointResult.success ? checkpointResult.data : {};

        // Blocker: Asana workspaces endpoint does not support modified_since or any
        // timestamp-based filtering, and there is no deleted-record endpoint for
        // workspaces. Full refresh with an offset checkpoint is required to resume
        // pagination across execution windows.
        await nango.trackDeletesStart('Workspace');

        let nextOffset: string | undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://developers.asana.com/reference/getworkspaces
            endpoint: '/api/1.0/workspaces',
            params: {
                opt_fields: 'gid,name,is_organization,email_domains,resource_type',
                ...(checkpoint.offset && { offset: checkpoint.offset })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'offset',
                cursor_path_in_response: 'next_page.offset',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    nextOffset = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const workspaces = page.map((item) => {
                const workspace = AsanaWorkspaceSchema.parse(item);
                return {
                    id: workspace.gid,
                    gid: workspace.gid,
                    ...(workspace.name != null && { name: workspace.name }),
                    ...(workspace.is_organization != null && { is_organization: workspace.is_organization }),
                    ...(workspace.email_domains != null && { email_domains: workspace.email_domains }),
                    ...(workspace.resource_type != null && { resource_type: workspace.resource_type })
                };
            });

            if (workspaces.length > 0) {
                await nango.batchSave(workspaces, 'Workspace');
            }

            if (nextOffset !== undefined) {
                await nango.saveCheckpoint({ offset: nextOffset });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Workspace');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
