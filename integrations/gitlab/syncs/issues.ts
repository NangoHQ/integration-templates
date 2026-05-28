import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const GitLabProjectSchema = z.object({
    id: z.number(),
    path_with_namespace: z.string().optional()
});

const GitLabIssueSchema = z.object({
    id: z.number(),
    project_id: z.number(),
    iid: z.number(),
    title: z.string(),
    description: z.string().nullable().optional(),
    state: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    closed_at: z.string().nullable().optional(),
    author: z
        .object({
            id: z.number(),
            username: z.string()
        })
        .optional(),
    labels: z.array(z.string()).optional(),
    web_url: z.string().optional()
});

const IssueSchema = z.object({
    id: z.string(),
    project_id: z.number(),
    iid: z.number(),
    title: z.string(),
    description: z.string().optional(),
    state: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    closed_at: z.string().optional(),
    author_id: z.number().optional(),
    author_username: z.string().optional(),
    labels: z.array(z.string()).optional(),
    web_url: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Sync issues from GitLab',
    version: '1.0.0',
    endpoints: [{ method: 'POST', path: '/syncs/issues' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Issue: IssueSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const projectsConfig: ProxyConfiguration = {
            // https://docs.gitlab.com/api/projects/#list-all-projects
            endpoint: '/api/v4/projects',
            params: {
                membership: 'true'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_calculation_method: 'per-page',
                offset_start_value: 1,
                limit_name_in_request: 'per_page',
                limit: 100
            },
            retries: 3
        };

        const projects: Array<z.infer<typeof GitLabProjectSchema>> = [];
        for await (const projectBatch of nango.paginate(projectsConfig)) {
            for (const raw of projectBatch) {
                const parsed = GitLabProjectSchema.safeParse(raw);
                if (parsed.success) {
                    projects.push(parsed.data);
                }
            }
        }

        let maxUpdatedAt: string | undefined;

        for (const project of projects) {
            const params: Record<string, string | number> = {
                state: 'all',
                order_by: 'updated_at',
                sort: 'asc'
            };
            if (checkpoint != null && checkpoint['updated_after'].length > 0) {
                params['updated_after'] = checkpoint['updated_after'];
            }

            const issuesConfig: ProxyConfiguration = {
                // https://docs.gitlab.com/api/issues/#list-all-project-issues
                endpoint: `/api/v4/projects/${encodeURIComponent(String(project.id))}/issues`,
                params,
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'page',
                    offset_calculation_method: 'per-page',
                    offset_start_value: 1,
                    limit_name_in_request: 'per_page',
                    limit: 100
                },
                retries: 3
            };

            for await (const issueBatch of nango.paginate(issuesConfig)) {
                const issues: Array<z.infer<typeof IssueSchema>> = [];

                for (const raw of issueBatch) {
                    const parsed = GitLabIssueSchema.safeParse(raw);
                    if (!parsed.success) {
                        continue;
                    }

                    const issue = parsed.data;
                    if (maxUpdatedAt === undefined || issue.updated_at > maxUpdatedAt) {
                        maxUpdatedAt = issue.updated_at;
                    }

                    issues.push({
                        id: String(issue.id),
                        project_id: issue.project_id,
                        iid: issue.iid,
                        title: issue.title,
                        ...(issue.description != null && { description: issue.description }),
                        state: issue.state,
                        created_at: issue.created_at,
                        updated_at: issue.updated_at,
                        ...(issue.closed_at != null && { closed_at: issue.closed_at }),
                        ...(issue.author != null && {
                            author_id: issue.author.id,
                            author_username: issue.author.username
                        }),
                        labels: issue.labels,
                        web_url: issue.web_url
                    });
                }

                if (issues.length > 0) {
                    await nango.batchSave(issues, 'Issue');
                }
            }
        }

        if (maxUpdatedAt !== undefined && maxUpdatedAt.length > 0) {
            await nango.saveCheckpoint({ updated_after: maxUpdatedAt });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
