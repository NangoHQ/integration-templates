import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    issueIdOrKey: z.string().describe('The ID or key of the issue to add the comment to. Example: "PROJ-123" or "10001"'),
    body: z.string().describe('The plain text content of the comment to add.')
});

// Jira API comment response schema
const ProviderCommentSchema = z.object({
    id: z.string(),
    self: z.string(),
    author: z
        .object({
            accountId: z.string(),
            displayName: z.string(),
            emailAddress: z.string().optional()
        })
        .passthrough()
        .optional(),
    body: z.object({}).passthrough(),
    created: z.string().optional(),
    updated: z.string().optional(),
    jsdPublic: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The ID of the created comment.'),
    self: z.string().describe('The REST API URL of the comment.'),
    author: z
        .object({
            accountId: z.string(),
            displayName: z.string(),
            emailAddress: z.string().optional()
        })
        .optional(),
    created: z.string().optional().describe('When the comment was created.'),
    updated: z.string().optional().describe('When the comment was last updated.')
});

const action = createAction({
    description: 'Add a comment to a Jira issue.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/add-comment',
        group: 'Issues'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write:jira-work'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Resolve cloudId from connection config or metadata
        const connection = await nango.getConnection();
        let cloudId = connection.connection_config?.['cloudId'];
        let baseUrl = connection.connection_config?.['baseUrl'];

        if (!cloudId || !baseUrl) {
            const metadata = await nango.getMetadata<{ cloudId?: string; baseUrl?: string }>();
            cloudId = cloudId || metadata?.cloudId;
            baseUrl = baseUrl || metadata?.baseUrl;
        }

        if (!cloudId) {
            // Discover cloudId via accessible-resources endpoint
            // https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/#other-integrations
            const discoveryResponse = await nango.get({
                endpoint: 'oauth/token/accessible-resources',
                retries: 3
            });

            const resources = z
                .array(
                    z.object({
                        id: z.string(),
                        url: z.string(),
                        name: z.string()
                    })
                )
                .parse(discoveryResponse.data);

            if (resources.length === 0) {
                throw new nango.ActionError({
                    type: 'no_accessible_resources',
                    message: 'No accessible Jira resources found for this connection.'
                });
            }

            const discoveredCloudId = resources[0]?.id;
            const discoveredBaseUrl = resources[0]?.url;
            if (!discoveredCloudId) {
                throw new nango.ActionError({
                    type: 'invalid_resource',
                    message: 'Accessible resource missing required id field.'
                });
            }

            cloudId = discoveredCloudId;
            baseUrl = discoveredBaseUrl;
        }

        if (!cloudId) {
            throw new nango.ActionError({
                type: 'missing_cloud_id',
                message: 'Could not determine Jira cloud ID.'
            });
        }

        // Build Atlassian Document Format body
        const adfBody = {
            type: 'doc',
            version: 1,
            content: [
                {
                    type: 'paragraph',
                    content: [
                        {
                            type: 'text',
                            text: input.body
                        }
                    ]
                }
            ]
        };

        // POST /rest/api/3/issue/{issueIdOrKey}/comment
        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-comments/#api-rest-api-3-issue-issueidorkey-comment-post
        const response = await nango.post({
            endpoint: `/ex/jira/${cloudId}/rest/api/3/issue/${input.issueIdOrKey}/comment`,
            headers: {
                'X-Atlassian-Token': 'no-check'
            },
            data: {
                body: adfBody
            },
            retries: 1
        });

        const comment = ProviderCommentSchema.parse(response.data);

        return {
            id: comment.id,
            self: comment.self,
            ...(comment.author && {
                author: {
                    accountId: comment.author.accountId,
                    displayName: comment.author.displayName,
                    ...(comment.author.emailAddress && { emailAddress: comment.author.emailAddress })
                }
            }),
            ...(comment.created && { created: comment.created }),
            ...(comment.updated && { updated: comment.updated })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
