import { createSync } from 'nango';
import { AsanaWorkspace } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Retrieve all workspaces for a user',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/workspaces',
            group: 'Workspaces'
        }
    ],

    models: {
        AsanaWorkspace: AsanaWorkspace
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const params: Record<string, string> = {
            limit: '100',
            opt_fields: ['gid', 'name', 'resource_type', 'is_organization'].join(',')
        };

        for await (const workspaces of nango.paginate<AsanaWorkspace>({ endpoint: '/api/1.0/workspaces', params, retries: 10 })) {
            const workspacesWithId = workspaces.map((workspace) => {
                return {
                    ...workspace,
                    id: workspace.gid
                };
            });
            await nango.batchSave(workspacesWithId, 'AsanaWorkspace');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
