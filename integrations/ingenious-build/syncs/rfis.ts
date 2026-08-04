import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderRfiSchema = z.object({
    id: z.string().describe('Example: 6a71df9dcb6ddf6b370e0a6f'),
    project_id: z.string(),
    title: z.string(),
    rfi_number: z.string(),
    due_date: z.string(),
    submitted_date: z.string().nullable(),
    status: z.string().describe('Example: draft'),
    priority: z.string(),
    ball_in_court_id: z.string().nullable(),
    manager_id: z.string().nullable(),
    official_reviewer_id: z.string().nullable(),
    responsible_contractor_ids: z.array(z.string()),
    question: z.string(),
    created_at: z.string().describe('Example: 2024-08-21T07:25:30Z'),
    updated_at: z.string().describe('Example: 2024-08-21T07:25:30Z'),
    created_by: z.string(),
    updated_by: z.string(),
    external_references: z.array(z.string()),
    document_ids: z.array(z.string()),
    solution_ids: z.array(z.string()),
    source_platform: z.string().nullable()
});

const RfiSchema = z.object({
    id: z.string().describe('Example: 6a71df9dcb6ddf6b370e0a6f'),
    project_id: z.string(),
    title: z.string(),
    rfi_number: z.string(),
    due_date: z.string(),
    submitted_date: z.string().optional(),
    status: z.string().describe('Example: draft'),
    priority: z.string(),
    ball_in_court_id: z.string().optional(),
    manager_id: z.string().optional(),
    official_reviewer_id: z.string().optional(),
    responsible_contractor_ids: z.array(z.string()),
    question: z.string(),
    created_at: z.string().describe('Example: 2024-08-21T07:25:30Z'),
    updated_at: z.string().describe('Example: 2024-08-21T07:25:30Z'),
    created_by: z.string(),
    updated_by: z.string(),
    external_references: z.array(z.string()),
    document_ids: z.array(z.string()),
    solution_ids: z.array(z.string()),
    source_platform: z.string().optional()
});

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync Requests for Information (RFIs) across projects.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Rfi: RfiSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let nextPage: number | undefined = checkpoint && typeof checkpoint['page'] === 'number' ? checkpoint['page'] : 1;

        // Full refresh — no incremental filter confirmed on this endpoint.
        // Resume the current full scan by checkpointing the next page.
        if (nextPage === 1) {
            await nango.trackDeletesStart('Rfi');
        }

        const proxyConfig: ProxyConfiguration = {
            // https://api.ingenious.build/reference/v2-get-rfis-list-1.md
            endpoint: '/api/v2/pub/rfis',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: nextPage ?? 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'items',
                on_page: async ({ nextPageParam }) => {
                    nextPage = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const rfis: Array<z.infer<typeof RfiSchema>> = [];

            for (const raw of batch) {
                const parsed = ProviderRfiSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse RFI: ${parsed.error.message}`);
                }

                const record = parsed.data;
                rfis.push({
                    id: record.id,
                    project_id: record.project_id,
                    title: record.title,
                    rfi_number: record.rfi_number,
                    due_date: record.due_date,
                    ...(record.submitted_date != null && { submitted_date: record.submitted_date }),
                    status: record.status,
                    priority: record.priority,
                    ...(record.ball_in_court_id != null && { ball_in_court_id: record.ball_in_court_id }),
                    ...(record.manager_id != null && { manager_id: record.manager_id }),
                    ...(record.official_reviewer_id != null && { official_reviewer_id: record.official_reviewer_id }),
                    responsible_contractor_ids: record.responsible_contractor_ids,
                    question: record.question,
                    created_at: record.created_at,
                    updated_at: record.updated_at,
                    created_by: record.created_by,
                    updated_by: record.updated_by,
                    external_references: record.external_references,
                    document_ids: record.document_ids,
                    solution_ids: record.solution_ids,
                    ...(record.source_platform != null && { source_platform: record.source_platform })
                });
            }

            if (rfis.length > 0) {
                await nango.batchSave(rfis, 'Rfi');
            }

            if (nextPage !== undefined) {
                await nango.saveCheckpoint({ page: nextPage });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Rfi');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
