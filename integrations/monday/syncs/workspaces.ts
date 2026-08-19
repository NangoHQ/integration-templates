import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const WorkspaceSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    kind: z.string().optional(),
    state: z.string().optional()
});

const RawWorkspaceSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    kind: z.string().nullable().optional(),
    state: z.string().nullable().optional()
});

const CheckpointSchema = z.object({
    page: z.number()
});

const sync = createSync({
    description: 'Sync workspaces from monday.com.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
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
        const checkpoint = await nango.getCheckpoint();
        const validatedCheckpoint = CheckpointSchema.safeParse(checkpoint);
        const startPage = validatedCheckpoint.success ? validatedCheckpoint.data.page : 1;
        let nextPage: number | undefined;

        await nango.trackDeletesStart('Workspace');

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
                offset_start_value: startPage,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'variables.limit',
                limit: 100,
                response_path: 'data.workspaces',
                on_page: async ({ nextPageParam }) => {
                    nextPage = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate(proxyConfig)) {
            const workspaces = pageResults.map((record) => {
                const parsed = RawWorkspaceSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Invalid workspace record: ${parsed.error.message}`);
                }
                return {
                    id: parsed.data.id,
                    ...(parsed.data.name != null && { name: parsed.data.name }),
                    ...(parsed.data.description != null && { description: parsed.data.description }),
                    ...(parsed.data.kind != null && { kind: parsed.data.kind }),
                    ...(parsed.data.state != null && { state: parsed.data.state })
                };
            });

            if (workspaces.length > 0) {
                await nango.batchSave(workspaces, 'Workspace');
            }

            if (nextPage !== undefined) {
                await nango.saveCheckpoint({ page: nextPage });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Workspace');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
