import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const GitLabProjectSchema = z.object({
    id: z.number().int(),
    empty_repo: z.boolean().optional()
});

const GitLabCommitSchema = z.object({
    id: z.string(),
    short_id: z.string().optional(),
    title: z.string().optional(),
    author_name: z.string().optional(),
    author_email: z.string().optional(),
    authored_date: z.string().optional(),
    committer_name: z.string().optional(),
    committer_email: z.string().optional(),
    committed_date: z.string().optional(),
    created_at: z.string().optional(),
    message: z.string().optional(),
    parent_ids: z.array(z.string()).optional(),
    web_url: z.string().optional()
});

const CommitSchema = z.object({
    id: z.string(),
    short_id: z.string().optional(),
    title: z.string().optional(),
    author_name: z.string().optional(),
    author_email: z.string().optional(),
    authored_date: z.string().optional(),
    committer_name: z.string().optional(),
    committer_email: z.string().optional(),
    committed_date: z.string().optional(),
    created_at: z.string().optional(),
    message: z.string().optional(),
    parent_ids: z.array(z.string()).optional(),
    web_url: z.string().optional()
});

const CheckpointSchema = z.object({
    committed_after: z.string()
});

const MetadataSchema = z.object({
    project_id: z.string().optional()
});

const sync = createSync({
    description: 'Sync commits from GitLab.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Commit: CommitSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/commits'
        }
    ],

    exec: async (nango) => {
        const metadataRaw = await nango.getMetadata();
        const metadata = MetadataSchema.parse(metadataRaw ?? {});

        let projectId = metadata.project_id;

        if (!projectId) {
            const projectsConfig: ProxyConfiguration = {
                // https://docs.gitlab.com/api/projects/#list-all-projects
                endpoint: '/api/v4/projects',
                params: {
                    membership: 'true'
                },
                paginate: {
                    type: 'link',
                    link_rel_in_response_header: 'next',
                    limit: 100,
                    limit_name_in_request: 'per_page'
                },
                retries: 3
            };

            for await (const page of nango.paginate(projectsConfig)) {
                for (const raw of page) {
                    const project = GitLabProjectSchema.parse(raw);
                    if (project.empty_repo === false) {
                        projectId = String(project.id);
                        break;
                    }
                }
                if (projectId) {
                    break;
                }
            }
        }

        if (!projectId) {
            throw new Error('No non-empty project found. Please provide project_id in metadata.');
        }

        const checkpoint = await nango.getCheckpoint();
        const committedAfter = checkpoint?.committed_after;

        const commitsConfig: ProxyConfiguration = {
            // https://docs.gitlab.com/api/commits/#list-repository-commits
            endpoint: `/api/v4/projects/${encodeURIComponent(projectId)}/repository/commits`,
            params: {
                ...(committedAfter ? { since: committedAfter } : {})
            },
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next',
                limit: 100,
                limit_name_in_request: 'per_page'
            },
            retries: 3
        };

        let latestCommittedDate: string | undefined;

        for await (const page of nango.paginate(commitsConfig)) {
            const commits = [];

            for (const raw of page) {
                const record = GitLabCommitSchema.parse(raw);
                const commit = {
                    id: record.id,
                    ...(record.short_id != null && { short_id: record.short_id }),
                    ...(record.title != null && { title: record.title }),
                    ...(record.author_name != null && { author_name: record.author_name }),
                    ...(record.author_email != null && { author_email: record.author_email }),
                    ...(record.authored_date != null && { authored_date: record.authored_date }),
                    ...(record.committer_name != null && { committer_name: record.committer_name }),
                    ...(record.committer_email != null && { committer_email: record.committer_email }),
                    ...(record.committed_date != null && { committed_date: record.committed_date }),
                    ...(record.created_at != null && { created_at: record.created_at }),
                    ...(record.message != null && { message: record.message }),
                    ...(record.parent_ids != null && { parent_ids: record.parent_ids }),
                    ...(record.web_url != null && { web_url: record.web_url })
                };
                commits.push(commit);

                if (record.committed_date) {
                    if (!latestCommittedDate || record.committed_date > latestCommittedDate) {
                        latestCommittedDate = record.committed_date;
                    }
                }
            }

            if (commits.length > 0) {
                await nango.batchSave(commits, 'Commit');
            }
        }

        if (latestCommittedDate) {
            await nango.saveCheckpoint({ committed_after: latestCommittedDate });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
