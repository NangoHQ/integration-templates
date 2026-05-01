import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    issueIdOrKey: z.string(),
    startAt: z.number().optional(),
    maxResults: z.number().optional()
});

const ChangelogItemSchema = z.object({
    field: z.string().optional(),
    fieldtype: z.string().optional(),
    fieldId: z.string().optional(),
    from: z.string().nullable().optional(),
    fromString: z.string().nullable().optional(),
    to: z.string().nullable().optional(),
    toString: z.string().nullable().optional()
});

const HistorySchema = z.object({
    id: z.string(),
    author: z
        .object({
            self: z.string().optional(),
            accountId: z.string().optional(),
            accountType: z.string().optional(),
            displayName: z.string().optional(),
            avatarUrls: z.record(z.string(), z.string()).optional()
        })
        .passthrough()
        .optional(),
    created: z.string(),
    items: z.array(ChangelogItemSchema),
    historyMetadata: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    changelog: z.array(HistorySchema),
    startAt: z.number().optional(),
    maxResults: z.number().optional(),
    total: z.number().optional(),
    isLast: z.boolean().optional()
});

const action = createAction({
    description: 'Retrieve the changelog for a Jira issue',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-issue-changelog',
        group: 'Issues'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:jira-work'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Get cloudId from connection config or metadata
        const connection = await nango.getConnection();
        let cloudId: string | undefined;

        // Try connection_config first
        if (connection.connection_config && typeof connection.connection_config === 'object') {
            cloudId = connection.connection_config['cloudId'];
        }

        // Fall back to metadata if not found in connection_config
        if (!cloudId) {
            const metadata = await nango.getMetadata<{ cloudId?: string }>();
            cloudId = metadata?.cloudId;
        }

        if (!cloudId || typeof cloudId !== 'string') {
            throw new nango.ActionError({
                type: 'missing_cloud_id',
                message: 'cloudId is required in connection config or metadata. Please reconnect your Jira integration.'
            });
        }

        // Build pagination params
        const params: Record<string, string | number> = {};
        if (input['startAt'] !== undefined) {
            params['startAt'] = input['startAt'];
        }
        if (input['maxResults'] !== undefined) {
            params['maxResults'] = input['maxResults'];
        }

        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-changelog/#api-rest-api-3-issue-issueidorkey-changelog-get
        const response = await nango.get({
            endpoint: `/ex/jira/${cloudId}/rest/api/3/issue/${input.issueIdOrKey}/changelog`,
            params: params,
            retries: 3
        });

        const changelogData = z
            .object({
                values: z.array(HistorySchema),
                startAt: z.number().optional(),
                maxResults: z.number().optional(),
                total: z.number().optional(),
                isLast: z.boolean().optional()
            })
            .parse(response.data);

        return {
            changelog: changelogData.values,
            ...(changelogData.startAt !== undefined && { startAt: changelogData.startAt }),
            ...(changelogData.maxResults !== undefined && { maxResults: changelogData.maxResults }),
            ...(changelogData.total !== undefined && { total: changelogData.total }),
            ...(changelogData.isLast !== undefined && { isLast: changelogData.isLast })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
