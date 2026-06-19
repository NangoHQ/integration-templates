import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const MetadataSchema = z.object({
    cloudId: z.string().optional(),
    baseUrl: z.string().optional()
});

const InputSchema = z.object({
    // No input required - lists all issue types available to the user
});

const IssueTypeSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    iconUrl: z.string().optional(),
    avatarId: z.number().optional(),
    subtask: z.boolean().optional(),
    hierarchyLevel: z.number().optional()
});

const OutputSchema = z.object({
    issueTypes: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            description: z.string().optional(),
            iconUrl: z.string().optional(),
            avatarId: z.number().optional(),
            subtask: z.boolean().optional(),
            hierarchyLevel: z.number().optional()
        })
    )
});

const AccessibleResourceSchema = z.object({
    id: z.string(),
    url: z.string(),
    name: z.string(),
    scopes: z.array(z.string()),
    avatarUrl: z.string()
});

const action = createAction({
    description: 'List Jira issue types available to the user',
    version: '1.0.1',
    metadata: MetadataSchema,
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let cloudId: string | undefined = connection.connection_config?.['cloudId'];
        let baseUrl: string | undefined = connection.connection_config?.['baseUrl'];

        if (!cloudId || !baseUrl) {
            const metadata = await nango.getMetadata<{
                cloudId?: string;
                baseUrl?: string;
            }>();
            cloudId = metadata?.cloudId;
            baseUrl = metadata?.baseUrl;
        }

        if (!cloudId || !baseUrl) {
            // https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/#accessible-resources
            const response = await nango.get({
                endpoint: 'oauth/token/accessible-resources',
                retries: 3
            });

            const resources = z.array(AccessibleResourceSchema).parse(response.data);
            if (resources.length === 0) {
                throw new nango.ActionError({
                    type: 'no_accessible_resources',
                    message: 'No accessible Jira resources found for this connection'
                });
            }

            const firstResource = resources[0];
            if (!firstResource) {
                throw new nango.ActionError({
                    type: 'no_accessible_resources',
                    message: 'No accessible Jira resources found for this connection'
                });
            }

            cloudId = firstResource.id;
            baseUrl = firstResource.url;

            await nango.updateMetadata({
                cloudId,
                baseUrl
            });
        }

        const config: ProxyConfiguration = {
            // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-types/#api-rest-api-3-issuetype-get
            endpoint: `/ex/jira/${cloudId}/rest/api/3/issuetype`,
            headers: {
                'X-Atlassian-Token': 'no-check'
            },
            retries: 3
        };

        const response = await nango.get(config);

        const issueTypes = z.array(IssueTypeSchema).parse(response.data);

        return {
            issueTypes: issueTypes.map((issueType) => ({
                id: issueType.id,
                name: issueType.name,
                ...(issueType.description !== undefined && {
                    description: issueType.description
                }),
                ...(issueType.iconUrl !== undefined && {
                    iconUrl: issueType.iconUrl
                }),
                ...(issueType.avatarId !== undefined && {
                    avatarId: issueType.avatarId
                }),
                ...(issueType.subtask !== undefined && {
                    subtask: issueType.subtask
                }),
                ...(issueType.hierarchyLevel !== undefined && {
                    hierarchyLevel: issueType.hierarchyLevel
                })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
