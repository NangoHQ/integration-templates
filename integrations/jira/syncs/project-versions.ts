import { createSync } from 'nango';
import { z } from 'zod';

// Jira Project Version API response schema
// https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-project-versions/#api-rest-api-3-project-projectidorkey-versions-get
const JiraVersionSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    archived: z.boolean().optional(),
    released: z.boolean().optional(),
    releaseDate: z.string().nullable().optional(),
    startDate: z.string().nullable().optional(),
    projectId: z.number().optional(),
    self: z.string().optional(),
    project: z.string().optional(),
    moveUnfixedIssuesTo: z.string().nullable().optional(),
    overdue: z.boolean().optional()
});

const ProjectVersionsSchema = z.array(JiraVersionSchema);

const MetadataSchema = z.object({
    cloudId: z.string().optional(),
    baseUrl: z.string().optional(),
    projectKeys: z.array(z.string()).optional()
});

const AccessibleResourceSchema = z.object({
    id: z.string(),
    url: z.string(),
    name: z.string()
});

const CheckpointSchema = z.object({
    projectIndex: z.number()
});

// Sync model schema
const ProjectVersionSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    projectId: z.number().optional(),
    projectKey: z.string().optional(),
    archived: z.boolean().optional(),
    released: z.boolean().optional(),
    releaseDate: z.string().optional(),
    startDate: z.string().optional(),
    self: z.string().optional(),
    overdue: z.boolean().optional()
});

type CheckpointType = z.infer<typeof CheckpointSchema>;

const sync = createSync({
    description: 'Sync Jira project versions for projects in scope',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/project-versions'
        }
    ],
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        ProjectVersion: ProjectVersionSchema
    },

    exec: async (nango) => {
        // Get cloudId and baseUrl from metadata or connection config
        // Metadata is checked first to allow test mocks to provide these values
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        let cloudId = parsedMetadata.success ? parsedMetadata.data.cloudId : undefined;
        let baseUrl = parsedMetadata.success ? parsedMetadata.data.baseUrl : undefined;

        // If not in metadata, check connection config
        if (!cloudId || !baseUrl) {
            const connection = await nango.getConnection();
            const connectionConfig = connection.connection_config;
            cloudId = cloudId || (typeof connectionConfig?.['cloudId'] === 'string' ? connectionConfig['cloudId'] : undefined);
            baseUrl = baseUrl || (typeof connectionConfig?.['baseUrl'] === 'string' ? connectionConfig['baseUrl'] : undefined);
        }

        // If still missing, fetch from accessible resources endpoint
        if (!cloudId || !baseUrl) {
            // https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/#3--get-the-cloudid-for-your-site
            const resourcesResponse = await nango.get({
                endpoint: 'oauth/token/accessible-resources',
                baseUrlOverride: 'https://api.atlassian.com',
                retries: 3
            });

            const resources = z.array(AccessibleResourceSchema).safeParse(resourcesResponse.data);
            if (!resources.success || resources.data.length === 0) {
                await nango.log('No accessible Jira resources found');
                return;
            }

            const resource = resources.data[0];
            if (!resource) {
                await nango.log('No accessible Jira resources found');
                return;
            }

            cloudId = resource.id;
            baseUrl = resource.url;

            // Cache for future runs
            await nango.updateMetadata({
                cloudId,
                baseUrl
            });
        }

        // Get project keys from metadata
        const projectKeys = parsedMetadata.success ? parsedMetadata.data.projectKeys : undefined;

        if (!projectKeys || projectKeys.length === 0) {
            await nango.log('No project keys found in metadata. Please set projectKeys in metadata.');
            return;
        }

        // Get checkpoint for resume support
        const checkpointResult = await nango.getCheckpoint();
        const checkpoint = CheckpointSchema.safeParse(checkpointResult);
        const startIndex = checkpoint.success && checkpoint.data.projectIndex < projectKeys.length ? checkpoint.data.projectIndex : 0;

        // Start delete tracking for full refresh
        await nango.trackDeletesStart('ProjectVersion');

        // Process each project
        for (let i = startIndex; i < projectKeys.length; i++) {
            const projectKey = projectKeys[i];

            await nango.log(`Fetching versions for project: ${projectKey}`);

            // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-project-versions/#api-rest-api-3-project-projectidorkey-versions-get
            // Note: This endpoint returns a direct array, not a paginated response
            const response = await nango.get({
                endpoint: `/ex/jira/${cloudId}/rest/api/3/project/${projectKey}/versions`,
                retries: 3,
                headers: {
                    'X-Atlassian-Token': 'no-check'
                }
            });

            const versions = ProjectVersionsSchema.safeParse(response.data);
            if (!versions.success) {
                throw new Error(`Failed to parse versions for project ${projectKey}: ${versions.error.message}`);
            }

            const mappedVersions = versions.data.map((version) => ({
                id: version.id,
                name: version.name,
                ...(version.description != null && { description: version.description }),
                ...(version.projectId != null && { projectId: version.projectId }),
                projectKey,
                ...(version.archived != null && { archived: version.archived }),
                ...(version.released != null && { released: version.released }),
                ...(version.releaseDate != null && { releaseDate: version.releaseDate }),
                ...(version.startDate != null && { startDate: version.startDate }),
                ...(version.self != null && { self: version.self }),
                ...(version.overdue != null && { overdue: version.overdue })
            }));

            if (mappedVersions.length > 0) {
                await nango.batchSave(mappedVersions, 'ProjectVersion');
            }

            // Save checkpoint after each project for resume capability
            if (i < projectKeys.length - 1) {
                const checkpointData: CheckpointType = {
                    projectIndex: i + 1
                };
                await nango.saveCheckpoint(checkpointData);
            }
        }

        await nango.clearCheckpoint();

        // End delete tracking - marks versions not seen in this run as deleted
        await nango.trackDeletesEnd('ProjectVersion');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
