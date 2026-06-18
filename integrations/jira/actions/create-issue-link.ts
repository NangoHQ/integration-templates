import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    type: z.string().describe('The name of the issue link type. Example: "Blocks"'),
    inwardIssueKey: z
        .string()
        .describe('The issue key for the inward side of the link (the issue that depends on or is affected by the other). Example: "PROJ-123"'),
    outwardIssueKey: z.string().describe('The issue key for the outward side of the link (the issue that affects or blocks the other). Example: "PROJ-456"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    linkType: z.string(),
    inwardIssueKey: z.string(),
    outwardIssueKey: z.string()
});

const MetadataSchema = z.object({
    cloudId: z.string().optional()
});

const AccessibleResourceSchema = z.object({
    id: z.string(),
    url: z.string(),
    name: z.string()
});

const action = createAction({
    description: 'Link two Jira issues with a relationship type',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write:jira-work'],
    metadata: MetadataSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Resolve cloudId from connection config
        const connection = await nango.getConnection();
        const configCloudId = connection.connection_config?.['cloudId'];

        let cloudId: string;

        if (configCloudId) {
            cloudId = configCloudId;
        } else {
            const metadata = await nango.getMetadata();
            if (metadata.cloudId) {
                cloudId = metadata.cloudId;
            } else {
                // Fetch accessible resources to get cloudId
                // https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/#oauth-2-0-3lo
                const accessibleResourcesResponse = await nango.get({
                    endpoint: 'oauth/token/accessible-resources',
                    retries: 3
                });

                const responseData = accessibleResourcesResponse.data;
                if (!responseData) {
                    throw new nango.ActionError({
                        type: 'invalid_response',
                        message: 'Accessible resources response data is missing.'
                    });
                }

                const resources = z.array(AccessibleResourceSchema).parse(responseData);

                const firstResource = resources[0];
                if (!firstResource) {
                    throw new nango.ActionError({
                        type: 'no_accessible_resources',
                        message: 'No accessible Jira resources found for this connection.'
                    });
                }

                cloudId = firstResource.id;
                await nango.updateMetadata({ cloudId });
            }
        }

        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-links/#api-rest-api-3-issuelink-post
        await nango.post({
            endpoint: `/ex/jira/${cloudId}/rest/api/3/issueLink`,
            headers: {
                'X-Atlassian-Token': 'no-check'
            },
            data: {
                type: {
                    name: input.type
                },
                inwardIssue: {
                    key: input.inwardIssueKey
                },
                outwardIssue: {
                    key: input.outwardIssueKey
                }
            },
            retries: 1
        });

        return {
            success: true,
            linkType: input.type,
            inwardIssueKey: input.inwardIssueKey,
            outwardIssueKey: input.outwardIssueKey
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
