import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderPunchItemSchema = z.object({
    id: z.string(),
    internal_id: z.number(),
    project_id: z.string(),
    punch_list_id: z.string().nullable(),
    status: z.string(),
    stamp_id: z.string().nullable(),
    title: z.string(),
    due_date: z.string(),
    comment: z.string().nullable(),
    originator_id: z.string(),
    ball_in_court_id: z.string().nullable(),
    responsible_contractor_id: z.string().nullable(),
    members_ids: z.array(z.string()),
    site_ids: z.array(z.string()),
    documents_ids: z.array(z.string()),
    external_references: z.array(z.string()),
    external_id: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    solution_ids: z.array(z.string())
});

const PunchItemSchema = z.object({
    id: z.string(),
    internal_id: z.number(),
    project_id: z.string(),
    punch_list_id: z.string().optional(),
    status: z.string(),
    stamp_id: z.string().optional(),
    title: z.string(),
    due_date: z.string(),
    comment: z.string().optional(),
    originator_id: z.string(),
    ball_in_court_id: z.string().optional(),
    responsible_contractor_id: z.string().optional(),
    members_ids: z.array(z.string()),
    site_ids: z.array(z.string()),
    documents_ids: z.array(z.string()),
    external_references: z.array(z.string()),
    external_id: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    solution_ids: z.array(z.string())
});

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync punch-list items (deficiency/completion tracking) across projects.',
    version: '1.0.0',
    frequency: 'every hour',
    checkpoint: CheckpointSchema,
    models: {
        PunchItem: PunchItemSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let nextPage: number | undefined = checkpoint && typeof checkpoint['page'] === 'number' ? checkpoint['page'] : 1;

        // Blocker: punch items only expose page/per_page pagination, so resume the
        // current full refresh by checkpointing the next page. Delete tracking is
        // started only once the first page has been fetched and validated (below), so a failure
        // on the very first request never leaves delete tracking started with nothing enumerated.
        let deletesStarted = false;

        const proxyConfig: ProxyConfiguration = {
            // https://api.ingenious.build/reference/v2-get-punch-items-list
            endpoint: '/api/v2/pub/punch-items',
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
            const punchItems = batch
                .map((raw) => {
                    const parsed = ProviderPunchItemSchema.safeParse(raw);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse punch item: ${parsed.error.message}`);
                    }
                    return parsed.data;
                })
                .map((item) => ({
                    id: item.id,
                    internal_id: item.internal_id,
                    project_id: item.project_id,
                    ...(item.punch_list_id !== null && { punch_list_id: item.punch_list_id }),
                    status: item.status,
                    ...(item.stamp_id !== null && { stamp_id: item.stamp_id }),
                    title: item.title,
                    due_date: item.due_date,
                    ...(item.comment !== null && { comment: item.comment }),
                    originator_id: item.originator_id,
                    ...(item.ball_in_court_id !== null && { ball_in_court_id: item.ball_in_court_id }),
                    ...(item.responsible_contractor_id !== null && { responsible_contractor_id: item.responsible_contractor_id }),
                    members_ids: item.members_ids,
                    site_ids: item.site_ids,
                    documents_ids: item.documents_ids,
                    external_references: item.external_references,
                    ...(item.external_id !== null && { external_id: item.external_id }),
                    created_at: item.created_at,
                    updated_at: item.updated_at,
                    solution_ids: item.solution_ids
                }));

            if (!deletesStarted) {
                await nango.trackDeletesStart('PunchItem');
                deletesStarted = true;
            }

            if (punchItems.length > 0) {
                await nango.batchSave(punchItems, 'PunchItem');
            }

            if (nextPage !== undefined) {
                await nango.saveCheckpoint({ page: nextPage });
            }
        }

        await nango.clearCheckpoint();

        if (deletesStarted) {
            await nango.trackDeletesEnd('PunchItem');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
