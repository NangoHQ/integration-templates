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

const sync = createSync({
    description: 'Sync workspaces visible to the authenticated Asana user.',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',
    endpoints: [{ method: 'POST', path: '/syncs/workspaces' }],
    models: {
        Workspace: WorkspaceSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('Workspace');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.asana.com/reference/getworkspaces
            endpoint: '/api/1.0/workspaces',
            params: {
                opt_fields: 'gid,name,is_organization,email_domains,resource_type'
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'offset',
                cursor_path_in_response: 'next_page.offset',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const workspaces = page.map(
                (workspace: {
                    gid: string;
                    name?: string | null;
                    is_organization?: boolean | null;
                    email_domains?: string[] | null;
                    resource_type?: string | null;
                }) => ({
                    id: workspace.gid,
                    gid: workspace.gid,
                    ...(workspace.name != null && { name: workspace.name }),
                    ...(workspace.is_organization != null && { is_organization: workspace.is_organization }),
                    ...(workspace.email_domains != null && { email_domains: workspace.email_domains }),
                    ...(workspace.resource_type != null && { resource_type: workspace.resource_type })
                })
            );

            if (workspaces.length > 0) {
                await nango.batchSave(workspaces, 'Workspace');
            }
        }

        await nango.trackDeletesEnd('Workspace');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
