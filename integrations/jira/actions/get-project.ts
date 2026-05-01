import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    projectIdOrKey: z.string().describe('The ID or key of the project to retrieve. Example: "10000" or "PROJ"')
});

// Jira Cloud REST API v3 project response schema
// https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-projects/#api-rest-api-3-project-projectidorkey-get
const ProviderProjectSchema = z.object({
    id: z.string(),
    key: z.string(),
    name: z.string(),
    description: z.union([z.string(), z.null()]).optional(),
    lead: z
        .object({
            self: z.string().optional(),
            accountId: z.string().optional(),
            displayName: z.string().optional()
        })
        .optional(),
    projectTypeKey: z.string(),
    style: z.string().optional(),
    url: z.string().optional(),
    self: z.string().optional(),
    avatarUrls: z.record(z.string(), z.string()).optional(),
    projectCategory: z
        .object({
            self: z.string().optional(),
            id: z.string(),
            name: z.string(),
            description: z.string().optional()
        })
        .optional(),
    assigneeType: z.string().optional(),
    components: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    key: z.string(),
    name: z.string(),
    description: z.string().optional(),
    projectType: z.string().describe('Project type key from Jira'),
    url: z.string().optional().describe('URL to the project'),
    browseUrl: z.string().optional().describe('Browser-facing URL to the project'),
    avatarUrls: z.record(z.string(), z.string()).optional(),
    lead: z
        .object({
            accountId: z.string().optional(),
            displayName: z.string().optional()
        })
        .optional(),
    projectCategory: z
        .object({
            id: z.string().optional(),
            name: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Retrieve a Jira project by ID or key.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-project',
        group: 'Projects'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Retrieve cloudId and baseUrl from connection config, metadata, or accessible-resources
        const connection = await nango.getConnection();
        const connectionConfig = connection.connection_config;
        let cloudId =
            connectionConfig && 'cloudId' in connectionConfig && typeof connectionConfig['cloudId'] === 'string' ? connectionConfig['cloudId'] : undefined;
        let baseUrl =
            connectionConfig && 'baseUrl' in connectionConfig && typeof connectionConfig['baseUrl'] === 'string' ? connectionConfig['baseUrl'] : undefined;

        if (!cloudId || !baseUrl) {
            // Try to get from metadata
            const metadata = await nango.getMetadata<{
                cloudId?: string;
                baseUrl?: string;
            }>();
            cloudId = cloudId || metadata?.cloudId;
            baseUrl = baseUrl || metadata?.baseUrl;
        }

        if (!cloudId || !baseUrl) {
            // Fetch from accessible-resources endpoint
            // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-other-operations/#api-oauth-token-accessible-resources-get
            const resourcesResponse = await nango.get({
                // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-other-operations/#api-oauth-token-accessible-resources-get
                endpoint: 'oauth/token/accessible-resources',
                retries: 3
            });

            if (!resourcesResponse.data || !Array.isArray(resourcesResponse.data) || resourcesResponse.data.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_cloud_id',
                    message: 'Unable to resolve Jira cloudId. No accessible resources found.'
                });
            }

            const resource = resourcesResponse.data[0];
            cloudId = cloudId || resource.id;
            baseUrl = baseUrl || resource.url;

            // Note: cloudId and baseUrl are resolved for this execution
            // They will be fetched again on subsequent runs if needed
        }

        if (!cloudId || !baseUrl) {
            throw new nango.ActionError({
                type: 'missing_cloud_id',
                message: 'Unable to resolve Jira cloudId and baseUrl.'
            });
        }

        // Fetch the project
        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-projects/#api-rest-api-3-project-projectidorkey-get
        const response = await nango.get({
            // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-projects/#api-rest-api-3-project-projectidorkey-get
            endpoint: `/ex/jira/${cloudId}/rest/api/3/project/${input.projectIdOrKey}`,
            headers: {
                'X-Atlassian-Token': 'no-check'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Project with ID or key "${input.projectIdOrKey}" not found.`,
                projectIdOrKey: input.projectIdOrKey
            });
        }

        const project = ProviderProjectSchema.parse(response.data);

        return {
            id: project.id,
            key: project.key,
            name: project.name,
            ...(project.description != null && { description: project.description }),
            projectType: project.projectTypeKey,
            ...(project.url != null && { url: project.url }),
            browseUrl: `${baseUrl}/browse/${project.key}`,
            ...(project.avatarUrls != null && { avatarUrls: project.avatarUrls }),
            ...(project.lead != null && {
                lead: {
                    ...(project.lead.accountId != null && { accountId: project.lead.accountId }),
                    ...(project.lead.displayName != null && { displayName: project.lead.displayName })
                }
            }),
            ...(project.projectCategory != null && {
                projectCategory: {
                    ...(project.projectCategory.id != null && { id: project.projectCategory.id }),
                    ...(project.projectCategory.name != null && { name: project.projectCategory.name })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
