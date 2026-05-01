import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    issueIdOrKey: z.string().describe('The ID or key of the issue. Example: "10001" or "PROJ-123"')
});

const WatcherSchema = z.object({
    accountId: z.string(),
    accountType: z.string().optional(),
    active: z.boolean(),
    avatarUrls: z.record(z.string(), z.string()).optional(),
    displayName: z.string(),
    emailAddress: z.string().optional(),
    key: z.string().optional(),
    name: z.string().optional(),
    self: z.string()
});

const ProviderWatchersSchema = z.object({
    isWatching: z.boolean(),
    self: z.string(),
    watchCount: z.number(),
    watchers: z.array(WatcherSchema)
});

const OutputSchema = z.object({
    isWatching: z.boolean(),
    watchCount: z.number(),
    watchers: z.array(
        z.object({
            accountId: z.string(),
            accountType: z.string().optional(),
            active: z.boolean(),
            avatarUrls: z.record(z.string(), z.string()).optional(),
            displayName: z.string(),
            emailAddress: z.string().optional(),
            self: z.string()
        })
    )
});

const action = createAction({
    description: 'List watchers on a Jira issue',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-watchers',
        group: 'Issues'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:jira-work'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Get connection to access cloudId from connection_config
        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/#authentication
        const connection = await nango.getConnection();
        let cloudId = connection.connection_config?.['cloudId'];

        // Fallback to metadata if not in connection_config
        if (!cloudId) {
            const metadata = await nango.getMetadata<{ cloudId?: string }>();
            cloudId = metadata?.cloudId;
        }

        if (!cloudId) {
            throw new nango.ActionError({
                type: 'missing_cloud_id',
                message: 'cloudId is required in connection_config or metadata but was not found'
            });
        }

        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-watchers/#api-rest-api-3-issue-issueidorkey-watchers-get
        const response = await nango.get({
            endpoint: `/ex/jira/${cloudId}/rest/api/3/issue/${input.issueIdOrKey}/watchers`,
            headers: {
                'X-Atlassian-Token': 'no-check'
            },
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Issue not found',
                issueIdOrKey: input.issueIdOrKey
            });
        }

        if (response.status === 403) {
            throw new nango.ActionError({
                type: 'permission_denied',
                message: 'Permission denied to view watchers for this issue',
                issueIdOrKey: input.issueIdOrKey
            });
        }

        const watchersData = ProviderWatchersSchema.parse(response.data);

        return {
            isWatching: watchersData.isWatching,
            watchCount: watchersData.watchCount,
            watchers: watchersData.watchers.map((watcher) => ({
                accountId: watcher.accountId,
                ...(watcher.accountType !== undefined && { accountType: watcher.accountType }),
                active: watcher.active,
                ...(watcher.avatarUrls !== undefined && { avatarUrls: watcher.avatarUrls }),
                displayName: watcher.displayName,
                ...(watcher.emailAddress !== undefined && { emailAddress: watcher.emailAddress }),
                self: watcher.self
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
