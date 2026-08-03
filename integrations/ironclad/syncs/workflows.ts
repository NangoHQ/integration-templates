import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const WorkflowSchema = z.object({
    id: z.string(),
    ironcladId: z.string().optional(),
    title: z.string().optional(),
    template: z.string().optional(),
    step: z.string().optional(),
    status: z.string().optional(),
    isCancelled: z.boolean().optional(),
    isComplete: z.boolean().optional(),
    isRevertibleToReview: z.boolean().optional(),
    created: z.string().optional(),
    lastUpdated: z.string().optional(),
    creator: z.unknown().optional(),
    schema: z.unknown().optional(),
    attributes: z.unknown().optional(),
    roles: z.unknown().optional(),
    approvals: z.unknown().optional(),
    signatures: z.unknown().optional(),
    recordIds: z.array(z.string()).optional()
});

const CheckpointSchema = z.object({
    page: z.number().int().min(0)
});

const sync = createSync({
    description: 'Sync contract workflows.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Workflow: WorkflowSchema
    },

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        const startingPage = checkpoint.success ? checkpoint.data.page : 0;

        // Full refresh (not an incremental `lastUpdated` filter): /workflows has no deleted-workflow
        // feed, so every hourly run must re-enumerate the full collection for trackDeletesStart/
        // trackDeletesEnd to detect deletions. Use the provider's page/pageSize pagination to
        // resume interrupted runs; trackDeletesStart is safe to call again on a resumed execution
        // and only the execution that completes the full pass calls trackDeletesEnd.

        await nango.trackDeletesStart('Workflow');
        let nextPage = startingPage;

        const proxyConfig: ProxyConfiguration = {
            // https://developer.ironcladapp.com/reference/list-all-workflows
            endpoint: '/public/api/v1/workflows',
            params: {
                status: 'active,completed,cancelled,paused'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: startingPage,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'pageSize',
                limit: 100,
                response_path: 'list'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const workflows = page.map((item) => {
                const parsed = WorkflowSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse workflow: ${parsed.error.message}`);
                }
                return parsed.data;
            });

            if (workflows.length === 0) {
                continue;
            }

            await nango.batchSave(workflows, 'Workflow');
            nextPage += 1;
            await nango.saveCheckpoint({ page: nextPage });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Workflow');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
