import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z
    .object({
        repositories: z
            .array(
                z
                    .object({
                        owner: z.string().describe('Repository owner login'),
                        repo: z.string().describe('Repository name')
                    })
                    .describe('A repository to sync issues from')
            )
            .describe('List of repositories to sync issues from')
    })
    .describe('Sync metadata specifying which repositories to fetch issues from');

const CheckpointSchema = z
    .object({
        updated_after: z.string().describe('ISO 8601 timestamp of the most recently updated issue from the last run')
    })
    .describe('Resume state for incremental issue syncing');

const IssueSchema = z
    .object({
        id: z.string().describe('Stable string identifier for the issue'),
        repository_owner: z.string().describe('Owner of the repository containing this issue'),
        repository_name: z.string().describe('Name of the repository containing this issue'),
        number: z.number().describe('Issue number within the repository'),
        title: z.string().describe('Issue title'),
        state: z.string().describe('Issue state, e.g., open or closed'),
        state_reason: z.string().optional().describe('Reason for the issue state, if available'),
        locked: z.boolean().describe('Whether the issue is locked'),
        author_login: z.string().optional().describe('Login of the issue author'),
        author_id: z.number().optional().describe('Numeric ID of the issue author'),
        labels: z.array(z.string()).describe('Label names attached to the issue'),
        assignee_logins: z.array(z.string()).describe('Login names of assigned users'),
        milestone_title: z.string().optional().describe('Title of the associated milestone, if any'),
        comments_count: z.number().describe('Number of comments on the issue'),
        created_at: z.string().describe('ISO 8601 timestamp when the issue was created'),
        updated_at: z.string().describe('ISO 8601 timestamp when the issue was last updated'),
        closed_at: z.string().optional().describe('ISO 8601 timestamp when the issue was closed, if applicable'),
        body: z.string().optional().describe('Issue body content'),
        html_url: z.string().describe('URL to view the issue on GitHub')
    })
    .describe('A GitHub issue in a repository');

const ProviderIssueSchema = z.object({
    id: z.union([z.number(), z.string()]),
    number: z.number(),
    title: z.string(),
    state: z.string(),
    state_reason: z.string().nullish(),
    locked: z.boolean(),
    user: z
        .object({
            login: z.string(),
            id: z.number()
        })
        .nullish(),
    labels: z
        .array(
            z.object({
                name: z.string()
            })
        )
        .optional(),
    assignees: z
        .array(
            z.object({
                login: z.string()
            })
        )
        .optional(),
    milestone: z
        .object({
            title: z.string()
        })
        .nullish(),
    comments: z.number(),
    created_at: z.string(),
    updated_at: z.string(),
    closed_at: z.string().nullish(),
    body: z.string().nullish(),
    html_url: z.string(),
    pull_request: z.unknown().optional()
});

const sync = createSync({
    description: 'Sync issues for one or more GitHub repositories with incremental updates based on issue activity',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Issue: IssueSchema
    },
    scopes: ['issues:read'],
    exec: async (nango) => {
        const metadata = MetadataSchema.parse(await nango.getMetadata());
        if (metadata.repositories.length === 0) {
            throw new Error('No repositories found in metadata');
        }

        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint == null ? undefined : CheckpointSchema.parse(rawCheckpoint);
        const requestUpdatedAfter = checkpoint?.updated_after;
        let maxUpdatedAt: string | undefined = requestUpdatedAfter;

        for (const repo of metadata.repositories) {
            const proxyConfig = {
                // https://docs.github.com/rest/issues/issues#list-repository-issues
                endpoint: `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/issues`,
                params: {
                    state: 'all',
                    sort: 'updated',
                    direction: 'asc',
                    ...(requestUpdatedAfter ? { since: requestUpdatedAfter } : {})
                },
                paginate: {
                    limit: 100,
                    limit_name_in_request: 'per_page'
                },
                retries: 3
            };

            for await (const batch of nango.paginate(proxyConfig)) {
                const issues = [];

                for (const raw of batch) {
                    const parsed = ProviderIssueSchema.safeParse(raw);
                    if (!parsed.success) {
                        continue;
                    }
                    if (parsed.data.pull_request !== undefined) {
                        continue;
                    }
                    issues.push(parsed.data);
                }

                if (issues.length === 0) {
                    continue;
                }

                const mappedIssues = issues.map((issue) => {
                    const labels = (issue.labels ?? []).map((label) => label.name).filter((name) => name !== '');

                    const assigneeLogins = (issue.assignees ?? []).map((assignee) => assignee.login).filter((login) => login !== '');

                    const updatedAt = issue.updated_at;
                    if (maxUpdatedAt === undefined || updatedAt > maxUpdatedAt) {
                        maxUpdatedAt = updatedAt;
                    }

                    return {
                        id: String(issue.id),
                        repository_owner: repo.owner,
                        repository_name: repo.repo,
                        number: issue.number,
                        title: issue.title,
                        state: issue.state,
                        state_reason: issue.state_reason ?? undefined,
                        locked: issue.locked,
                        author_login: issue.user?.login ?? undefined,
                        author_id: issue.user?.id ?? undefined,
                        labels,
                        assignee_logins: assigneeLogins,
                        milestone_title: issue.milestone?.title ?? undefined,
                        comments_count: issue.comments,
                        created_at: issue.created_at,
                        updated_at: issue.updated_at,
                        closed_at: issue.closed_at ?? undefined,
                        body: issue.body ?? undefined,
                        html_url: issue.html_url
                    };
                });

                await nango.batchSave(mappedIssues, 'Issue');
            }
        }

        if (maxUpdatedAt !== undefined) {
            await nango.saveCheckpoint({ updated_after: maxUpdatedAt });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
