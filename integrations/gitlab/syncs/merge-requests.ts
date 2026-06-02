import { createSync } from 'nango';
import { z } from 'zod';

const GitLabMergeRequestSchema = z.object({
    id: z.number(),
    iid: z.number(),
    project_id: z.number(),
    title: z.string(),
    description: z.string().nullable().optional(),
    state: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    author: z
        .object({
            id: z.number(),
            username: z.string()
        })
        .nullable()
        .optional(),
    source_branch: z.string(),
    target_branch: z.string(),
    web_url: z.string(),
    draft: z.boolean(),
    labels: z.array(z.string()).nullable().optional(),
    merged_at: z.string().nullable().optional(),
    closed_at: z.string().nullable().optional()
});

const GitLabProjectSchema = z.object({
    id: z.number()
});

const MergeRequestSchema = z.object({
    id: z.string(),
    iid: z.number(),
    project_id: z.number(),
    title: z.string(),
    description: z.string().optional(),
    state: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    author_id: z.number().optional(),
    author_username: z.string().optional(),
    source_branch: z.string(),
    target_branch: z.string(),
    web_url: z.string(),
    draft: z.boolean(),
    labels: z.array(z.string()).optional(),
    merged_at: z.string().optional(),
    closed_at: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Sync merge requests from GitLab',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        MergeRequest: MergeRequestSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/merge-requests'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const initialUpdatedAfter = checkpoint?.updated_after;
        let maxUpdatedAt: string | undefined;

        // https://docs.gitlab.com/api/projects/#list-all-projects
        for await (const projectBatchUntyped of nango.paginate({
            endpoint: '/api/v4/projects',
            params: {
                membership: 'true'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100
            },
            retries: 3
        })) {
            const projectBatch: unknown[] = projectBatchUntyped;

            for (const rawProject of projectBatch) {
                const project = GitLabProjectSchema.parse(rawProject);
                const projectId = String(project.id);

                // https://docs.gitlab.com/api/merge_requests/#list-project-merge-requests
                for await (const mergeRequestBatchUntyped of nango.paginate({
                    endpoint: `/api/v4/projects/${encodeURIComponent(projectId)}/merge_requests`,
                    params: {
                        state: 'all',
                        order_by: 'updated_at',
                        sort: 'asc',
                        ...(initialUpdatedAfter ? { updated_after: initialUpdatedAfter } : {})
                    },
                    paginate: {
                        type: 'offset',
                        offset_name_in_request: 'page',
                        offset_start_value: 1,
                        offset_calculation_method: 'per-page',
                        limit_name_in_request: 'per_page',
                        limit: 100
                    },
                    retries: 3
                })) {
                    const mergeRequestBatch: unknown[] = mergeRequestBatchUntyped;
                    const records: z.infer<typeof MergeRequestSchema>[] = [];

                    for (const rawMergeRequest of mergeRequestBatch) {
                        const item = GitLabMergeRequestSchema.parse(rawMergeRequest);

                        if (maxUpdatedAt === undefined || item.updated_at > maxUpdatedAt) {
                            maxUpdatedAt = item.updated_at;
                        }

                        records.push({
                            id: String(item.id),
                            iid: item.iid,
                            project_id: item.project_id,
                            title: item.title,
                            ...(item.description != null && { description: item.description }),
                            state: item.state,
                            created_at: item.created_at,
                            updated_at: item.updated_at,
                            ...(item.author != null && {
                                author_id: item.author.id,
                                author_username: item.author.username
                            }),
                            source_branch: item.source_branch,
                            target_branch: item.target_branch,
                            web_url: item.web_url,
                            draft: item.draft,
                            ...(Array.isArray(item.labels) && { labels: item.labels }),
                            ...(item.merged_at != null && { merged_at: item.merged_at }),
                            ...(item.closed_at != null && { closed_at: item.closed_at })
                        });
                    }

                    if (records.length > 0) {
                        await nango.batchSave(records, 'MergeRequest');
                    }
                }
            }
        }

        if (maxUpdatedAt) {
            await nango.saveCheckpoint({ updated_after: maxUpdatedAt });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
