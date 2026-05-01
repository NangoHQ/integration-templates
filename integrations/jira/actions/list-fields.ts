import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderFieldSchema = z.object({
    id: z.string(),
    name: z.string(),
    custom: z.boolean().optional(),
    orderable: z.boolean().optional(),
    navigable: z.boolean().optional(),
    searchable: z.boolean().optional(),
    clauseNames: z.array(z.string()).optional(),
    key: z.string().optional(),
    schema: z
        .object({
            type: z.string().optional(),
            system: z.string().optional(),
            custom: z.string().optional(),
            customId: z.number().optional()
        })
        .optional()
});

const FieldOutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    custom: z.boolean().optional(),
    orderable: z.boolean().optional(),
    navigable: z.boolean().optional(),
    searchable: z.boolean().optional(),
    clauseNames: z.array(z.string()).optional(),
    key: z.string().optional(),
    schema: z
        .object({
            type: z.string().optional(),
            system: z.string().optional(),
            custom: z.string().optional(),
            customId: z.number().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    fields: z.array(FieldOutputSchema)
});

const MetadataSchema = z.object({
    cloudId: z.string().optional(),
    baseUrl: z.string().optional()
});

const action = createAction({
    description: 'List Jira field metadata available to the user.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-fields',
        group: 'Fields'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        const configCloudId = connection.connection_config?.['cloudId'];
        const configBaseUrl = connection.connection_config?.['baseUrl'];

        let cloudId: string | undefined = configCloudId;
        let baseUrl: string | undefined = configBaseUrl;

        if (!cloudId || !baseUrl) {
            const metadata = await nango.getMetadata<{ cloudId?: string; baseUrl?: string }>();
            cloudId = cloudId || metadata?.cloudId;
            baseUrl = baseUrl || metadata?.baseUrl;
        }

        if (!cloudId || !baseUrl) {
            const response = await nango.get({
                // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-oauth-2-0/#api-rest-oauth-2-0-token-accessible-resources-get
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
                .parse(response.data);

            const [firstResource] = resources;

            if (!firstResource) {
                throw new nango.ActionError({
                    type: 'no_accessible_resources',
                    message: 'No accessible Jira resources found for this connection.'
                });
            }

            await nango.updateMetadata({
                cloudId: firstResource.id,
                baseUrl: firstResource.url
            });

            cloudId = firstResource.id;
            baseUrl = firstResource.url;
        }

        if (!cloudId) {
            throw new nango.ActionError({
                type: 'missing_cloud_id',
                message: 'Unable to resolve Jira Cloud ID.'
            });
        }

        const fieldsResponse = await nango.get({
            // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-fields/#api-rest-api-3-field-get
            endpoint: `/ex/jira/${cloudId}/rest/api/3/field`,
            retries: 3
        });

        const fields = z.array(ProviderFieldSchema).parse(fieldsResponse.data);

        return {
            fields: fields.map((field) => ({
                id: field.id,
                name: field.name,
                ...(field.custom !== undefined && { custom: field.custom }),
                ...(field.orderable !== undefined && { orderable: field.orderable }),
                ...(field.navigable !== undefined && { navigable: field.navigable }),
                ...(field.searchable !== undefined && { searchable: field.searchable }),
                ...(field.clauseNames !== undefined && { clauseNames: field.clauseNames }),
                ...(field.key !== undefined && { key: field.key }),
                ...(field.schema !== undefined && { schema: field.schema })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
