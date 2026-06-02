import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';
const ApplicationSchema = z.object({
    id: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    candidate_id: z.string().optional(),
    job_id: z.string().optional(),
    status: z.string().optional(),
    source_id: z.string().optional(),
    current_stage_id: z.string().optional(),
    applied_date: z.string().optional(),
    archived_at: z.string().optional(),
    custom_fields: z.array(z.unknown()).optional()
});

const CheckpointSchema = z.object({
    sync_token: z.string(),
    cursor: z.string()
});

const MetadataSchema = z.object({
    created_after: z.number().optional()
});

const AshbyResponseSchema = z.object({
    syncToken: z.string().optional(),
    moreDataAvailable: z.boolean().optional()
});

const AshbyApplicationSchema = z.object({
    id: z.string(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    candidate: z.object({ id: z.string() }).nullable().optional(),
    job: z.object({ id: z.string() }).nullable().optional(),
    status: z.string().optional(),
    source: z.object({ id: z.string() }).nullable().optional(),
    currentStage: z.object({ id: z.string() }).nullable().optional(),
    appliedDate: z.string().optional(),
    archivedAt: z.string().nullable().optional(),
    customFields: z.array(z.unknown()).optional()
});

const sync = createSync({
    description: 'Sync applications from Ashby.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Application: ApplicationSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/applications'
        }
    ],
    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const checkpoint = await nango.getCheckpoint();
        let syncToken = checkpoint?.sync_token || undefined;
        let nextCursor = checkpoint?.cursor || undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://developers.ashbyhq.com/reference/applicationlist
            endpoint: '/application.list',
            method: 'POST',
            data: {
                limit: 100,
                ...(metadata?.created_after && { createdAfter: metadata.created_after }),
                ...(syncToken && { syncToken }),
                ...(nextCursor && { cursor: nextCursor })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'nextCursor',
                response_path: 'results',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam, response }) => {
                    nextCursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                    const parsedResponse = AshbyResponseSchema.safeParse(response.data);
                    if (parsedResponse.success && parsedResponse.data.syncToken && parsedResponse.data.moreDataAvailable === false) {
                        syncToken = parsedResponse.data.syncToken;
                    }
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const applications = page.map((record) => {
                const parsed = AshbyApplicationSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse application record: ${JSON.stringify(parsed.error.issues)}`);
                }
                const app = parsed.data;
                return {
                    id: app.id,
                    ...(app.createdAt && { created_at: app.createdAt }),
                    ...(app.updatedAt && { updated_at: app.updatedAt }),
                    ...(app.candidate?.id && { candidate_id: app.candidate.id }),
                    ...(app.job?.id && { job_id: app.job.id }),
                    ...(app.status && { status: app.status }),
                    ...(app.source?.id && { source_id: app.source.id }),
                    ...(app.currentStage?.id && { current_stage_id: app.currentStage.id }),
                    ...(app.appliedDate && { applied_date: app.appliedDate }),
                    ...(app.archivedAt != null && { archived_at: app.archivedAt }),
                    ...(app.customFields && { custom_fields: app.customFields })
                };
            });

            if (applications.length > 0) {
                await nango.batchSave(applications, 'Application');
            }

            await nango.saveCheckpoint({
                sync_token: syncToken ?? '',
                cursor: nextCursor ?? ''
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
