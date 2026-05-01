import { createAction } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({
    fieldId: z.string().describe('The ID of the field to retrieve. For example: "summary", "description", or "customfield_10101"')
});

const SchemaFieldSchema = z.object({
    type: z.string().optional(),
    system: z.string().optional(),
    custom: z.string().optional(),
    customId: z.number().optional(),
    items: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    custom: z.boolean(),
    clauseNames: z.array(z.string()),
    navigable: z.boolean(),
    orderable: z.boolean(),
    searchable: z.boolean(),
    key: z.string().optional(),
    schema: SchemaFieldSchema.optional()
});

const JiraResourceSchema = z.object({
    id: z.string(),
    url: z.string()
});

interface MetadataType {
    cloudId?: string;
    baseUrl?: string;
}

export default createAction({
    description: 'Retrieve Jira field metadata by field ID',
    version: '1.0.0',
    endpoint: {
        path: '/actions/get-field',
        method: 'POST'
    },
    scopes: ['read:field:jira'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        // Validate input using Zod
        await nango.zodValidateInput({ zodSchema: InputSchema, input });

        // Get cloudId from connection config or metadata
        const connection = await nango.getConnection();
        let cloudId: string | undefined = connection.connection_config?.['cloudId'];
        let baseUrl: string | undefined = connection.connection_config?.['baseUrl'];

        if (!cloudId || !baseUrl) {
            const metadata = await nango.getMetadata<MetadataType>();
            cloudId = metadata?.cloudId;
            baseUrl = metadata?.baseUrl;
        }

        if (!cloudId || !baseUrl) {
            // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-oauth-token-accessible-resources/
            const accessibleResourcesResponse = await nango.get({
                endpoint: 'https://api.atlassian.com/oauth/token/accessible-resources',
                retries: 3
            });

            const resources = accessibleResourcesResponse.data;
            if (!Array.isArray(resources) || resources.length === 0) {
                throw new nango.ActionError({
                    message: 'No accessible Jira resources found for this connection'
                });
            }

            const parsedResource = JiraResourceSchema.safeParse(resources[0]);
            if (!parsedResource.success) {
                throw new nango.ActionError({
                    message: 'Invalid Jira resource format returned from API'
                });
            }

            cloudId = parsedResource.data.id;
            baseUrl = parsedResource.data.url;
        }

        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-fields/#api-rest-api-3-field-get
        const response = await nango.get({
            endpoint: `/ex/jira/${cloudId}/rest/api/3/field`,
            retries: 3,
            headers: {
                'X-Atlassian-Token': 'no-check'
            }
        });

        const fields = response.data;
        if (!Array.isArray(fields)) {
            throw new nango.ActionError({
                message: 'Unexpected response format from Jira API'
            });
        }

        const field = fields.find((f: { id: string }) => f.id === input.fieldId);

        if (!field) {
            throw new nango.ActionError({
                message: `Field with ID '${input.fieldId}' not found`
            });
        }

        return field;
    }
});
