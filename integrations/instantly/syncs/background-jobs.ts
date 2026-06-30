import { createSync, type ProxyConfiguration } from 'nango';
import * as z from 'zod';

const BackgroundJobSchema = z.object({
    id: z.string(),
    workspace_id: z.string(),
    user_id: z.string().nullable().optional(),
    type: z.string(),
    entity_id: z.string().nullable().optional(),
    entity_type: z.string().optional(),
    data: z.record(z.string(), z.unknown()).optional(),
    progress: z.number(),
    status: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

const CheckpointSchema = z.object({
    created_after: z.string()
});

const sync = createSync({
    description: 'Sync background jobs.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            path: '/syncs/background-jobs',
            method: 'GET'
        }
    ],
    models: {
        BackgroundJob: BackgroundJobSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        let createdAfter: string | undefined;
        if (rawCheckpoint != null) {
            const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint);
            if (!checkpointResult.success) {
                throw new Error(`Invalid checkpoint: ${checkpointResult.error.message}`);
            }
            createdAfter = checkpointResult.data.created_after;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://developer.instantly.ai/api-reference/groups/background-job
            endpoint: '/v2/background-jobs',
            params: {
                sort_column: 'created_at',
                sort_order: 'asc',
                limit: 100,
                ...(createdAfter && { starting_after: createdAfter })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'starting_after',
                cursor_path_in_response: 'next_starting_after',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const jobs: Array<z.infer<typeof BackgroundJobSchema>> = [];
            for (const raw of page) {
                const parsed = BackgroundJobSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Invalid background job: ${parsed.error.message}`);
                }
                jobs.push(parsed.data);
            }

            if (jobs.length === 0) {
                continue;
            }

            await nango.batchSave(jobs, 'BackgroundJob');
            const lastJob = jobs[jobs.length - 1];
            if (lastJob === undefined) {
                continue;
            }
            await nango.saveCheckpoint({
                created_after: lastJob.created_at
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
