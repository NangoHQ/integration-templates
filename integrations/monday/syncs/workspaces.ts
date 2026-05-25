import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const WorkspaceSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    kind: z.string().optional(),
    state: z.string().optional()
});

const sync = createSync({
    description: 'Sync workspaces from monday.com.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Workspace: WorkspaceSchema
    },
    // https://developer.monday.com/api-reference/reference/workspaces
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/workspaces'
        }
    ],

    exec: async (nango) => {
        const proxyConfig: ProxyConfiguration = {
            // https://developer.monday.com/api-reference/reference/workspaces
            endpoint: '/v2',
            method: 'POST',
            headers: {
                'api-version': '2026-04'
            },
            data: {
                query: 'query ($limit: Int, $page: Int) { workspaces(limit: $limit, page: $page) { id name description kind state } }',
                variables: {
                    limit: 100,
                    page: 1
                }
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'variables.page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'variables.limit',
                limit: 100,
                response_path: 'data.workspaces'
            },
            retries: 3
        };

        await nango.trackDeletesStart('Workspace');

        for await (const pageResults of nango.paginate(proxyConfig)) {
            const workspaces = pageResults.map(
                (record: { id: string; name?: string | null; description?: string | null; kind?: string | null; state?: string | null }) => ({
                    id: record.id,
                    ...(record.name != null && { name: record.name }),
                    ...(record.description != null && { description: record.description }),
                    ...(record.kind != null && { kind: record.kind }),
                    ...(record.state != null && { state: record.state })
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
