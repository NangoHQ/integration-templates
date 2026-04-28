import { createSync } from 'nango';
import { z } from 'zod';

const ProjectComponentSchema = z.object({
    id: z.string(),
    projectId: z.string(),
    projectKey: z.string(),
    name: z.string(),
    description: z.string().optional(),
    assigneeType: z.string().optional(),
    realAssigneeType: z.string().optional(),
    isAssigneeTypeValid: z.boolean().optional(),
    leadAccountId: z.string().optional(),
    leadDisplayName: z.string().optional()
});

const JiraComponentSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    projectId: z.number().optional(),
    project: z.string().optional(),
    assigneeType: z.string().nullable().optional(),
    realAssigneeType: z.string().nullable().optional(),
    isAssigneeTypeValid: z.boolean().optional(),
    lead: z
        .object({
            accountId: z.string().optional(),
            displayName: z.string().optional()
        })
        .nullable()
        .optional()
});

const CheckpointSchema = z.object({
    projectIndex: z.number()
});

type Checkpoint = z.infer<typeof CheckpointSchema>;

async function getCloudIdAndBaseUrl(nango: Parameters<Parameters<typeof createSync>[0]['exec']>[0]): Promise<{ cloudId: string; baseUrl: string }> {
    const connection = await nango.getConnection();

    const connectionConfig = connection.connection_config;
    let cloudId: string | undefined;
    let baseUrl: string | undefined;

    if (connectionConfig && typeof connectionConfig === 'object') {
        const configObj = z.object({}).passthrough().safeParse(connectionConfig);
        if (configObj.success) {
            const data = configObj.data;
            if (typeof data['cloudId'] === 'string') {
                cloudId = data['cloudId'];
            }
            if (typeof data['baseUrl'] === 'string') {
                baseUrl = data['baseUrl'];
            }
        }
    }

    if (!cloudId || !baseUrl) {
        const metadata = await nango.getMetadata();
        const metadataRecord = z
            .object({
                cloudId: z.string().optional(),
                baseUrl: z.string().optional()
            })
            .safeParse(metadata);
        if (metadataRecord.success) {
            cloudId = cloudId || metadataRecord.data.cloudId;
            baseUrl = baseUrl || metadataRecord.data.baseUrl;
        }
    }

    if (!cloudId || !baseUrl) {
        // https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/#3--get-cloudid-and-other-information-for-the-site
        const response = await nango.get({
            endpoint: 'oauth/token/accessible-resources',
            retries: 3
        });

        const accessibleResources = z
            .array(
                z.object({
                    id: z.string(),
                    url: z.string()
                })
            )
            .safeParse(response.data);

        if (!accessibleResources.success || accessibleResources.data.length === 0) {
            throw new Error('Could not determine Jira cloudId and baseUrl');
        }

        const resources = accessibleResources.data;
        if (resources.length === 0) {
            throw new Error('Could not determine Jira cloudId and baseUrl');
        }

        const firstResource = resources[0];
        if (!firstResource) {
            throw new Error('Could not determine Jira cloudId and baseUrl');
        }
        cloudId = firstResource.id;
        baseUrl = firstResource.url;

        const metadataToUpdate: Record<string, string> = {};
        if (cloudId) {
            metadataToUpdate['cloudId'] = cloudId;
        }
        if (baseUrl) {
            metadataToUpdate['baseUrl'] = baseUrl;
        }
        if (Object.keys(metadataToUpdate).length > 0) {
            await nango.updateMetadata(metadataToUpdate);
        }
    }

    if (!cloudId || !baseUrl) {
        throw new Error('Could not determine Jira cloudId and baseUrl');
    }

    return { cloudId, baseUrl };
}

async function getProjectKeys(nango: Parameters<Parameters<typeof createSync>[0]['exec']>[0]): Promise<string[]> {
    const metadata = await nango.getMetadata();
    const metadataRecord = z
        .object({
            projectKeys: z.array(z.string()).optional()
        })
        .safeParse(metadata);

    if (metadataRecord.success && metadataRecord.data.projectKeys && metadataRecord.data.projectKeys.length > 0) {
        return metadataRecord.data.projectKeys;
    }

    const { cloudId } = await getCloudIdAndBaseUrl(nango);

    const projectKeys: string[] = [];

    // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-projects/#api-rest-api-3-project-search-get
    type OffsetPagination = {
        type: 'offset';
        offset_name_in_request: 'startAt';
        offset_calculation_method: 'per-page';
        limit_name_in_request: 'maxResults';
        limit: number;
        response_path: 'values';
    };

    const paginateConfig: OffsetPagination = {
        type: 'offset',
        offset_name_in_request: 'startAt',
        offset_calculation_method: 'per-page',
        limit_name_in_request: 'maxResults',
        limit: 50,
        response_path: 'values'
    };

    const proxyConfig = {
        endpoint: `/ex/jira/${cloudId}/rest/api/3/project/search`,
        headers: {
            'X-Atlassian-Token': 'no-check'
        },
        paginate: paginateConfig,
        retries: 3
    };

    for await (const page of nango.paginate<{ key: string }>(proxyConfig)) {
        for (const project of page) {
            projectKeys.push(project.key);
        }
    }

    return projectKeys;
}

const sync = createSync({
    description: 'Sync Jira project components for projects in scope',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        ProjectComponent: ProjectComponentSchema
    },
    endpoints: [{ path: '/syncs/project-components', method: 'POST' }],

    exec: async (nango) => {
        const checkpointData = await nango.getCheckpoint();
        let checkpoint: Checkpoint | undefined;
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpointData);
        if (parsedCheckpoint.success) {
            checkpoint = parsedCheckpoint.data;
        }

        const projectKeys = await getProjectKeys(nango);

        if (projectKeys.length === 0) {
            await nango.log('No projects found to sync components');
            return;
        }

        await nango.trackDeletesStart('ProjectComponent');

        const { cloudId } = await getCloudIdAndBaseUrl(nango);
        let projectIndex = checkpoint?.projectIndex ?? 0;

        if (projectIndex >= projectKeys.length) {
            projectIndex = 0;
            await nango.saveCheckpoint({ projectIndex: 0 });
        }

        while (projectIndex < projectKeys.length) {
            const projectKey = projectKeys[projectIndex];

            // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-project-components/#api-rest-api-3-project-projectidorkey-components-get
            const response = await nango.get({
                endpoint: `/ex/jira/${cloudId}/rest/api/3/project/${projectKey}/components`,
                headers: {
                    'X-Atlassian-Token': 'no-check'
                },
                retries: 3
            });

            const parsedComponents = z.array(JiraComponentSchema).safeParse(response.data);
            if (!parsedComponents.success) {
                throw new Error(`Failed to parse Jira components for project ${projectKey}: ${parsedComponents.error.message}`);
            }

            const components = parsedComponents.data.map((component) => ({
                id: component.id,
                projectId: String(component.projectId ?? ''),
                projectKey,
                name: component.name,
                ...(component.description != null && { description: component.description }),
                ...(component.assigneeType != null && { assigneeType: component.assigneeType }),
                ...(component.realAssigneeType != null && { realAssigneeType: component.realAssigneeType }),
                ...(component.isAssigneeTypeValid != null && { isAssigneeTypeValid: component.isAssigneeTypeValid }),
                ...(component.lead?.accountId != null && { leadAccountId: component.lead.accountId }),
                ...(component.lead?.displayName != null && { leadDisplayName: component.lead.displayName })
            }));

            if (components.length > 0) {
                await nango.batchSave(components, 'ProjectComponent');
            }

            projectIndex++;
            const newCheckpoint: Checkpoint = {
                projectIndex
            };
            await nango.saveCheckpoint(newCheckpoint);
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('ProjectComponent');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
