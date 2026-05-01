import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    projectIds: z.array(z.string()).optional().describe('List of project IDs to filter by. Example: ["10000", "10001"]'),
    projectKeys: z.array(z.string()).optional().describe('List of project keys to filter by. Example: ["PROJ", "TEST"]'),
    issuetypeIds: z.array(z.string()).optional().describe('List of issue type IDs to filter by. Example: ["10000", "10001"]'),
    expand: z
        .string()
        .optional()
        .describe(
            'Use expand to include additional information about issue metadata in the response. Supported values: projects, projects.issuetypes, projects.issuetypes.fields'
        )
});

const ProjectSchema = z.object({
    id: z.string(),
    key: z.string(),
    name: z.string(),
    self: z.string().optional(),
    avatarUrls: z.record(z.string(), z.string()).optional()
});

const ProviderResponseSchema = z.object({
    projects: z.array(ProjectSchema).optional()
});

const OutputSchema = z.object({
    projects: z.array(ProjectSchema).optional()
});

const action = createAction({
    description: 'Retrieve project and issue type metadata for issue creation.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-create-issue-metadata',
        group: 'Issues'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:jira-work', 'read:issue-meta:jira'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Get cloudId from connection config or metadata
        const connection = await nango.getConnection();
        const connectionConfig = connection?.connection_config;
        const cloudIdConfig = connectionConfig?.['cloudId'];
        let cloudId = typeof cloudIdConfig === 'string' ? cloudIdConfig : undefined;

        // Fallback to metadata if not found in connection config
        if (!cloudId) {
            const metadata = await nango.getMetadata<{ cloudId?: string }>();
            const metadataCloudId = metadata?.cloudId;
            cloudId = typeof metadataCloudId === 'string' ? metadataCloudId : undefined;
        }

        if (!cloudId) {
            throw new nango.ActionError({
                type: 'missing_cloud_id',
                message: 'cloudId is required in connection configuration or metadata. Please ensure the connection has the cloudId configured.'
            });
        }

        // Build query parameters
        const params: Record<string, string | string[]> = {};

        if (input.projectIds && input.projectIds.length > 0) {
            params['projectIds'] = input.projectIds;
        }

        if (input.projectKeys && input.projectKeys.length > 0) {
            params['projectKeys'] = input.projectKeys;
        }

        if (input.issuetypeIds && input.issuetypeIds.length > 0) {
            params['issuetypeIds'] = input.issuetypeIds;
        }

        if (input.expand) {
            params['expand'] = input.expand;
        }

        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-createmeta-get
        const response = await nango.get({
            endpoint: `/ex/jira/${cloudId}/rest/api/3/issue/createmeta`,
            params,
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            projects: providerData.projects
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
