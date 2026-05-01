import { createSync } from 'nango';
import { z } from 'zod';

const IssueSchema = z.object({
    id: z.string(),
    key: z.string(),
    self: z.string(),
    web_url: z.string().optional(),
    summary: z.string().optional(),
    description: z.unknown().optional(),
    status: z.string().optional(),
    issue_type: z.string().optional(),
    priority: z.string().optional(),
    project_id: z.string().optional(),
    project_key: z.string().optional(),
    reporter_id: z.string().optional(),
    assignee_id: z.string().optional(),
    creator_id: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    labels: z.array(z.string()).optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    next_page_token: z.string(),
    jql: z.string()
});

const StoredCheckpointSchema = z.object({
    updated_after: z.string().optional(),
    next_page_token: z.string().optional(),
    jql: z.string().optional()
});

const MetadataSchema = z.object({
    jql: z.string().optional(),
    cloudId: z.string().optional(),
    baseUrl: z.string().optional()
});

type AccessibleResource = {
    id: string;
    url: string;
};

type JiraIssue = {
    id: string;
    key: string;
    self: string;
    fields?: {
        summary?: string;
        description?: unknown;
        status?: { name?: string };
        issuetype?: { name?: string };
        priority?: { name?: string };
        project?: { id?: string; key?: string };
        reporter?: { accountId?: string };
        assignee?: { accountId?: string } | null;
        creator?: { accountId?: string };
        created?: string;
        updated?: string;
        labels?: string[];
    };
};

type IssueRecord = {
    id: string;
    key: string;
    self: string;
    web_url?: string;
    summary?: string;
    description?: unknown;
    status?: string;
    issue_type?: string;
    priority?: string;
    project_id?: string;
    project_key?: string;
    reporter_id?: string;
    assignee_id?: string;
    creator_id?: string;
    created_at?: string;
    updated_at?: string;
    labels?: string[];
};

function normalizeJql(jql: string | undefined): string {
    return (jql ?? '').replace(/\s+ORDER\s+BY[\s\S]*$/i, '').trim();
}

const sync = createSync({
    description: 'Sync Jira issues using JQL-backed search with incremental updates',
    version: '3.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/issues' }],
    checkpoint: CheckpointSchema,
    metadata: MetadataSchema,
    models: {
        Issue: IssueSchema
    },

    exec: async (nango) => {
        const parsedCheckpoint = StoredCheckpointSchema.safeParse(await nango.getCheckpoint());
        const checkpoint = parsedCheckpoint.success ? parsedCheckpoint.data : undefined;

        const parsedMetadata = MetadataSchema.safeParse(await nango.getMetadata());
        const metadata = parsedMetadata.success ? parsedMetadata.data : undefined;

        let cloudId = metadata?.cloudId;
        let baseUrl = metadata?.baseUrl;

        if (!cloudId || !baseUrl) {
            const connection = await nango.getConnection();
            cloudId = connection.connection_config?.['cloudId'];
            baseUrl = connection.connection_config?.['baseUrl'];
        }

        if (!cloudId || !baseUrl) {
            // https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/#2-get-the-cloudid-for-your-site
            const response = await nango.get<AccessibleResource[]>({
                endpoint: 'oauth/token/accessible-resources',
                retries: 3
            });

            const resources = Array.isArray(response.data) ? response.data : [];
            const site = resources[0];
            if (!site) {
                throw new Error('No accessible Jira site found');
            }

            cloudId = site.id;
            baseUrl = site.url;

            await nango.updateMetadata({
                jql: metadata?.jql,
                cloudId,
                baseUrl
            });
        }

        const configuredJql = normalizeJql(metadata?.jql);
        const checkpointMatchesConfiguredJql = !checkpoint || (checkpoint.jql ?? '') === configuredJql;
        const updatedAfter = checkpointMatchesConfiguredJql ? checkpoint?.updated_after : undefined;
        let nextPageToken = checkpointMatchesConfiguredJql ? checkpoint?.next_page_token : undefined;

        const initialBackfillFilter = !updatedAfter && !configuredJql ? 'updated >= "1970-01-01"' : '';
        const jqlClauses = [configuredJql ? `(${configuredJql})` : '', updatedAfter ? `updated >= "${updatedAfter}"` : initialBackfillFilter].filter(Boolean);
        const finalJql = jqlClauses.length > 0 ? `${jqlClauses.join(' AND ')} ORDER BY updated ASC` : 'ORDER BY updated ASC';

        const params: Record<string, string | number> = {
            jql: finalJql,
            fields: 'summary,description,status,issuetype,priority,project,reporter,assignee,creator,created,updated,labels'
        };

        if (nextPageToken) {
            params['nextPageToken'] = nextPageToken;
        }

        const proxyConfig = {
            // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/#api-rest-api-3-search-jql-get
            endpoint: `/ex/jira/${cloudId}/rest/api/3/search/jql`,
            params,
            headers: {
                'X-Atlassian-Token': 'no-check'
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'nextPageToken',
                cursor_path_in_response: 'nextPageToken',
                response_path: 'issues',
                limit_name_in_request: 'maxResults',
                limit: 50,
                on_page: async (paginationState: { nextPageParam?: string | number | undefined; response: unknown }) => {
                    const nextPageParam = paginationState.nextPageParam;
                    nextPageToken = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        } satisfies import('nango').ProxyConfiguration;

        for await (const page of nango.paginate<JiraIssue>(proxyConfig)) {
            const issues: IssueRecord[] = page.map((issue) => {
                const fields = issue.fields || {};
                return {
                    id: issue.id,
                    key: issue.key,
                    self: issue.self,
                    web_url: `${baseUrl}/browse/${issue.key}`,
                    ...(fields.summary ? { summary: fields.summary } : {}),
                    ...(fields.description ? { description: fields.description } : {}),
                    ...(fields.status?.name ? { status: fields.status.name } : {}),
                    ...(fields.issuetype?.name ? { issue_type: fields.issuetype.name } : {}),
                    ...(fields.priority?.name ? { priority: fields.priority.name } : {}),
                    ...(fields.project?.id ? { project_id: fields.project.id } : {}),
                    ...(fields.project?.key ? { project_key: fields.project.key } : {}),
                    ...(fields.reporter?.accountId ? { reporter_id: fields.reporter.accountId } : {}),
                    ...(fields.assignee?.accountId ? { assignee_id: fields.assignee.accountId } : {}),
                    ...(fields.creator?.accountId ? { creator_id: fields.creator.accountId } : {}),
                    ...(fields.created ? { created_at: fields.created } : {}),
                    ...(fields.updated ? { updated_at: fields.updated } : {}),
                    ...(fields.labels ? { labels: fields.labels } : {})
                };
            });

            if (issues.length === 0) {
                continue;
            }

            await nango.batchSave(issues, 'Issue');

            const lastIssue = issues[issues.length - 1];

            if (!lastIssue) {
                continue;
            }

            const lastUpdated = lastIssue.updated_at || '';

            if (nextPageToken) {
                await nango.saveCheckpoint({
                    jql: configuredJql,
                    updated_after: updatedAfter || '',
                    next_page_token: nextPageToken
                });
            } else if (lastUpdated) {
                await nango.saveCheckpoint({
                    jql: configuredJql,
                    updated_after: lastUpdated,
                    next_page_token: ''
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
