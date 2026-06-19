import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    issueIdOrKey: z.string().describe('The ID or key of the issue to retrieve. Example: "10001" or "PROJ-123"'),
    fields: z.string().optional().describe('Comma-separated list of fields to return. Example: "summary,description,status"'),
    expand: z.string().optional().describe('Comma-separated list of fields to expand. Example: "renderedFields,names,schema"'),
    properties: z.string().optional().describe('Comma-separated list of issue property keys to return. Example: "property1,property2"')
});

const IssueSchema = z
    .object({
        id: z.string(),
        key: z.string(),
        self: z.string()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the issue'),
        key: z.string().describe('The issue key (e.g., "PROJ-123")'),
        self: z.string().describe('The REST API URL of the issue')
    })
    .passthrough();

async function getCloudId(nango: NangoActionLocal): Promise<string> {
    const connection = await nango.getConnection();

    let cloudId: string | undefined;

    if (connection.connection_config && typeof connection.connection_config === 'object') {
        const config = connection.connection_config;
        if ('cloudId' in config && typeof config['cloudId'] === 'string') {
            cloudId = config['cloudId'];
        }
    }

    if (!cloudId) {
        const metadata = await nango.getMetadata<{ cloudId?: string }>();
        cloudId = metadata?.cloudId;
    }

    if (!cloudId) {
        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-myself/#api-rest-api-3-myself-get
        const response = await nango.get({
            endpoint: 'oauth/token/accessible-resources',
            retries: 3
        });

        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
            const resource = response.data[0];
            cloudId = resource['id'];
        }
    }

    if (!cloudId) {
        throw new nango.ActionError({
            type: 'missing_cloud_id',
            message: 'Could not determine Jira cloud ID. Please verify the connection is properly configured.'
        });
    }

    return cloudId;
}

const action = createAction({
    description: 'Retrieve a Jira issue by ID or key',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:jira-work'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const cloudId = await getCloudId(nango);

        const params: Record<string, string> = {};
        if (input.fields !== undefined) {
            params['fields'] = input.fields;
        }
        if (input.expand !== undefined) {
            params['expand'] = input.expand;
        }
        if (input.properties !== undefined) {
            params['properties'] = input.properties;
        }

        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-get
        const response = await nango.get({
            endpoint: `/ex/jira/${cloudId}/rest/api/3/issue/${input.issueIdOrKey}`,
            params: params,
            headers: {
                'X-Atlassian-Token': 'no-check'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Issue not found: ${input.issueIdOrKey}`,
                issueIdOrKey: input.issueIdOrKey
            });
        }

        const issue = IssueSchema.parse(response.data);

        return issue;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
