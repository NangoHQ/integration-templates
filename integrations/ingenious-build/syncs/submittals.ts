import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderSubmittalSchema = z.object({
    id: z.string(),
    project_id: z.string(),
    package_id: z.string().nullable().optional(),
    status: z.string(),
    type_id: z.string().nullable().optional(),
    title: z.string(),
    number: z.string(),
    description: z.string().nullable().optional(),
    due_date: z.string().nullable().optional(),
    ball_in_court_id: z.string().nullable().optional(),
    submittal_manager_id: z.string().nullable().optional(),
    official_reviewer_id: z.string().nullable().optional(),
    additional_reviewer_ids: z.array(z.string()).optional(),
    impacted_party_ids: z.array(z.string()).optional(),
    responsible_contractor_id: z.string().nullable().optional(),
    document_ids: z.array(z.string()).optional(),
    created_at: z.string(),
    updated_at: z.string()
});

type ProviderSubmittal = z.infer<typeof ProviderSubmittalSchema>;

const SubmittalSchema = z.object({
    id: z.string(),
    project_id: z.string(),
    package_id: z.string().optional(),
    status: z.string(),
    type_id: z.string().optional(),
    title: z.string(),
    number: z.string(),
    description: z.string().optional(),
    due_date: z.string().optional(),
    ball_in_court_id: z.string().optional(),
    submittal_manager_id: z.string().optional(),
    official_reviewer_id: z.string().optional(),
    additional_reviewer_ids: z.array(z.string()).optional(),
    impacted_party_ids: z.array(z.string()).optional(),
    responsible_contractor_id: z.string().optional(),
    document_ids: z.array(z.string()).optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync submittals across projects',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Submittal: SubmittalSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let nextPage: number | undefined = checkpoint && typeof checkpoint['page'] === 'number' ? checkpoint['page'] : 1;

        // Blocker: provider only exposes /api/v2/pub/submittals with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor beyond page/per_page. Delete
        // tracking is started only once the first page has been fetched and validated (below),
        // so a failure on the very first request never leaves delete tracking started with
        // nothing enumerated.
        let deletesStarted = false;

        const proxyConfig: ProxyConfiguration = {
            // https://api.ingenious.build/reference/v2-get-submittals-list.md
            endpoint: '/api/v2/pub/submittals',
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

        for await (const page of nango.paginate<ProviderSubmittal>(proxyConfig)) {
            const parsed = z.array(ProviderSubmittalSchema).safeParse(page);
            if (!parsed.success) {
                throw new Error(`Failed to validate submittal page: ${parsed.error.message}`);
            }

            const submittals = parsed.data.map((submittal) => ({
                id: submittal.id,
                project_id: submittal.project_id,
                ...(submittal.package_id != null && { package_id: submittal.package_id }),
                status: submittal.status,
                ...(submittal.type_id != null && { type_id: submittal.type_id }),
                title: submittal.title,
                number: submittal.number,
                ...(submittal.description != null && { description: submittal.description }),
                ...(submittal.due_date != null && { due_date: submittal.due_date }),
                ...(submittal.ball_in_court_id != null && { ball_in_court_id: submittal.ball_in_court_id }),
                ...(submittal.submittal_manager_id != null && { submittal_manager_id: submittal.submittal_manager_id }),
                ...(submittal.official_reviewer_id != null && { official_reviewer_id: submittal.official_reviewer_id }),
                ...(submittal.additional_reviewer_ids != null && { additional_reviewer_ids: submittal.additional_reviewer_ids }),
                ...(submittal.impacted_party_ids != null && { impacted_party_ids: submittal.impacted_party_ids }),
                ...(submittal.responsible_contractor_id != null && { responsible_contractor_id: submittal.responsible_contractor_id }),
                ...(submittal.document_ids != null && { document_ids: submittal.document_ids }),
                created_at: submittal.created_at,
                updated_at: submittal.updated_at
            }));

            if (!deletesStarted) {
                await nango.trackDeletesStart('Submittal');
                deletesStarted = true;
            }

            if (submittals.length > 0) {
                await nango.batchSave(submittals, 'Submittal');
            }

            if (nextPage !== undefined) {
                await nango.saveCheckpoint({ page: nextPage });
            }
        }

        await nango.clearCheckpoint();

        if (deletesStarted) {
            await nango.trackDeletesEnd('Submittal');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
