import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    priorityId: z.string().describe('The priority ID. Example: "1"')
});

const ProviderPrioritySchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional().nullable(),
    iconUrl: z.string().optional().nullable(),
    statusColor: z.string().optional().nullable(),
    self: z.string().optional().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    iconUrl: z.string().optional(),
    statusColor: z.string().optional(),
    self: z.string().optional()
});

const ConnectionConfigSchema = z.object({
    cloudId: z.string().optional(),
    baseUrl: z.string().optional()
});

const MetadataSchema = z.object({
    cloudId: z.string().optional(),
    baseUrl: z.string().optional()
});

const AccessibleResourceSchema = z.object({
    id: z.string(),
    url: z.string()
});

const AccessibleResourcesResponseSchema = z.array(AccessibleResourceSchema);

async function getCloudIdAndBaseUrl(nango: Parameters<Parameters<typeof createAction>[0]['exec']>[0]): Promise<{ cloudId: string; baseUrl: string }> {
    const connection = await nango.getConnection();

    // First check connection_config
    let cloudId: string | undefined;
    let baseUrl: string | undefined;

    if (connection.connection_config) {
        const connectionConfig = ConnectionConfigSchema.safeParse(connection.connection_config);
        if (connectionConfig.success) {
            cloudId = connectionConfig.data.cloudId;
            baseUrl = connectionConfig.data.baseUrl;
        }
    }

    if (cloudId && baseUrl) {
        return { cloudId, baseUrl };
    }

    // Then check metadata
    const metadata = MetadataSchema.safeParse(await nango.getMetadata());
    if (metadata.success) {
        cloudId = cloudId || metadata.data.cloudId;
        baseUrl = baseUrl || metadata.data.baseUrl;
    }

    if (cloudId && baseUrl) {
        return { cloudId, baseUrl };
    }

    // Finally, call the accessible-resources endpoint
    // https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/#base-url
    const accessibleResourcesResponse = await nango.get({
        endpoint: 'oauth/token/accessible-resources',
        retries: 3
    });

    const accessibleData = AccessibleResourcesResponseSchema.safeParse(accessibleResourcesResponse.data);
    if (accessibleData.success && accessibleData.data.length > 0) {
        const firstResource = accessibleData.data[0];
        if (firstResource) {
            cloudId = cloudId || firstResource.id;
            baseUrl = baseUrl || firstResource.url;
        }
    }

    if (!cloudId || !baseUrl) {
        throw new nango.ActionError({
            type: 'invalid_connection',
            message: 'Unable to determine cloudId or baseUrl from connection.'
        });
    }

    const finalCloudId = cloudId;
    const finalBaseUrl = baseUrl;

    // Cache for subsequent runs
    await nango.updateMetadata({ cloudId: finalCloudId, baseUrl: finalBaseUrl });

    return { cloudId: finalCloudId, baseUrl: finalBaseUrl };
}

const action = createAction({
    description: 'Retrieve a Jira priority by priority ID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-priority',
        group: 'Priorities'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['read:issue-details:jira'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const { cloudId } = await getCloudIdAndBaseUrl(nango);

        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-priorities/#api-rest-api-3-priority-id-get
        const response = await nango.get({
            endpoint: `/ex/jira/${cloudId}/rest/api/3/priority/${input.priorityId}`,
            headers: {
                'X-Atlassian-Token': 'no-check'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Priority with ID "${input.priorityId}" was not found.`,
                priorityId: input.priorityId
            });
        }

        const providerPriority = ProviderPrioritySchema.parse(response.data);

        return {
            id: providerPriority.id,
            name: providerPriority.name,
            ...(providerPriority.description != null && { description: providerPriority.description }),
            ...(providerPriority.iconUrl != null && { iconUrl: providerPriority.iconUrl }),
            ...(providerPriority.statusColor != null && { statusColor: providerPriority.statusColor }),
            ...(providerPriority.self != null && { self: providerPriority.self })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
