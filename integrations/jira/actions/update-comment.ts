import { z } from 'zod';
import { createAction } from 'nango';

const AtlassianDocumentSchema = z.object({}).passthrough();

const VisibilitySchema = z
    .object({
        type: z.enum(['role', 'group']),
        value: z.string().optional(),
        identifier: z.string().optional()
    })
    .optional();

const InputSchema = z.object({
    issueIdOrKey: z.string().describe('Issue ID or key. Example: "10001" or "PROJ-123"'),
    commentId: z.string().describe('Comment ID. Example: "10000"'),
    body: AtlassianDocumentSchema,
    visibility: VisibilitySchema.describe('Visibility of the comment'),
    notifyUsers: z.boolean().optional().describe('Notify users about the comment update'),
    overrideEditableFlag: z.boolean().optional().describe('Override the editable flag')
});

const UserSchema = z.object({
    accountId: z.string().optional(),
    displayName: z.string().optional(),
    active: z.boolean().optional(),
    self: z.string().optional()
});

const CommentSchema = z.object({
    id: z.string(),
    self: z.string().optional(),
    author: UserSchema.optional(),
    body: AtlassianDocumentSchema.optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
    updateAuthor: UserSchema.optional(),
    visibility: VisibilitySchema
});

const OutputSchema = z.object({
    id: z.string(),
    self: z.string().optional(),
    author: UserSchema.optional(),
    body: AtlassianDocumentSchema.optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
    updateAuthor: UserSchema.optional(),
    visibility: VisibilitySchema
});

const MetadataSchema = z.object({
    cloudId: z.string().optional(),
    baseUrl: z.string().optional()
});

const action = createAction({
    description: 'Update a comment on a Jira issue',
    version: '1.0.0',
    endpoint: {
        method: 'PUT',
        path: '/actions/update-comment',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['write:jira-work'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let cloudId = connection.connection_config?.['cloudId'];
        let baseUrl = connection.connection_config?.['baseUrl'];

        if (!cloudId || !baseUrl) {
            const metadata = await nango.getMetadata();
            cloudId = metadata?.cloudId;
            baseUrl = metadata?.baseUrl;
        }

        if (!cloudId || !baseUrl) {
            // https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/#access-to-the-cloudid-and-baseurl
            const accessibleResourcesResponse = await nango.get({
                endpoint: 'oauth/token/accessible-resources',
                retries: 3
            });

            const resources = z
                .array(
                    z.object({
                        id: z.string(),
                        url: z.string()
                    })
                )
                .parse(accessibleResourcesResponse.data);

            if (!resources || resources.length === 0) {
                throw new nango.ActionError({
                    type: 'no_accessible_resources',
                    message: 'No accessible Jira resources found for this connection'
                });
            }

            const resource = resources[0];
            if (!resource) {
                throw new nango.ActionError({
                    type: 'no_accessible_resources',
                    message: 'No accessible Jira resources found for this connection'
                });
            }

            cloudId = resource.id;
            baseUrl = resource.url;

            await nango.updateMetadata({
                cloudId,
                baseUrl
            });
        }

        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-comments/#api-rest-api-3-issue-issueidorkey-comment-id-put
        const response = await nango.put({
            endpoint: `/ex/jira/${cloudId}/rest/api/3/issue/${input.issueIdOrKey}/comment/${input.commentId}`,
            headers: {
                'X-Atlassian-Token': 'no-check'
            },
            params: {
                ...(input.notifyUsers !== undefined && {
                    notifyUsers: input.notifyUsers.toString()
                }),
                ...(input.overrideEditableFlag !== undefined && {
                    overrideEditableFlag: input.overrideEditableFlag.toString()
                })
            },
            data: {
                body: input.body,
                ...(input.visibility !== undefined && {
                    visibility: input.visibility
                })
            },
            retries: 3
        });

        const updatedComment = CommentSchema.parse(response.data);

        return {
            id: updatedComment.id,
            ...(updatedComment.self !== undefined && { self: updatedComment.self }),
            ...(updatedComment.author !== undefined && { author: updatedComment.author }),
            ...(updatedComment.body !== undefined && { body: updatedComment.body }),
            ...(updatedComment.created !== undefined && { created: updatedComment.created }),
            ...(updatedComment.updated !== undefined && { updated: updatedComment.updated }),
            ...(updatedComment.updateAuthor !== undefined && {
                updateAuthor: updatedComment.updateAuthor
            }),
            ...(updatedComment.visibility !== undefined && {
                visibility: updatedComment.visibility
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
