import { createSync } from 'nango';
import { z } from 'zod';

const IssueTypeSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    iconUrl: z.string().optional(),
    avatarId: z.number().optional(),
    subtask: z.boolean().optional(),
    hierarchyLevel: z.number().optional(),
    entityId: z.string().optional(),
    scope: z
        .object({
            type: z.string(),
            project: z.object({
                id: z.string()
            })
        })
        .optional(),
    self: z.string().optional()
});

const MetadataSchema = z.object({
    cloudId: z.string().optional(),
    baseUrl: z.string().optional()
});

interface JiraMetadata {
    cloudId?: string;
    baseUrl?: string;
}

const sync = createSync({
    description: 'Sync Jira issue types available to the authenticated user',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        IssueType: IssueTypeSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/issue-types'
        }
    ],
    metadata: MetadataSchema,

    exec: async (nango) => {
        // Resolve cloudId for Jira Cloud API calls
        const connection = await nango.getConnection();
        const connectionConfig = connection.connection_config;
        let cloudId: string | undefined =
            connectionConfig && typeof connectionConfig === 'object' && 'cloudId' in connectionConfig ? String(connectionConfig['cloudId']) : undefined;
        let baseUrl: string | undefined =
            connectionConfig && typeof connectionConfig === 'object' && 'baseUrl' in connectionConfig ? String(connectionConfig['baseUrl']) : undefined;

        if (!cloudId || !baseUrl) {
            const metadata = await nango.getMetadata<JiraMetadata>();
            cloudId = metadata['cloudId'];
            baseUrl = metadata['baseUrl'];
        }

        if (!cloudId || !baseUrl) {
            // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-workflows/
            const accessibleResources = await nango.get({
                endpoint: '/oauth/token/accessible-resources',
                retries: 3
            });

            const resources = accessibleResources.data;
            if (!Array.isArray(resources) || resources.length === 0) {
                throw new Error('No accessible Jira resources found');
            }

            const firstResource = resources[0];
            if (!firstResource || typeof firstResource !== 'object') {
                throw new Error('No accessible Jira resources found');
            }

            if (!('id' in firstResource) || !('url' in firstResource)) {
                throw new Error('No accessible Jira resources found');
            }

            cloudId = String(firstResource['id']);
            baseUrl = String(firstResource['url']);

            await nango.updateMetadata({
                cloudId: cloudId,
                baseUrl: baseUrl
            });
        }

        // Full refresh: track deletions since API doesn't support incremental filtering
        await nango.trackDeletesStart('IssueType');

        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-types/#api-rest-api-3-issuetype-get
        const response = await nango.get({
            endpoint: `/ex/jira/${cloudId}/rest/api/3/issuetype`,
            headers: {
                'X-Atlassian-Token': 'no-check'
            },
            retries: 3
        });

        const issueTypes = response.data;
        if (!Array.isArray(issueTypes)) {
            throw new Error('Invalid response from Jira API: expected array of issue types');
        }

        const records = issueTypes
            .filter((item) => item !== null && typeof item === 'object')
            .map((issueType) => ({
                id: String(issueType['id']),
                name: String(issueType['name']),
                ...(typeof issueType['description'] === 'string' && { description: issueType['description'] }),
                ...(typeof issueType['iconUrl'] === 'string' && { iconUrl: issueType['iconUrl'] }),
                ...(typeof issueType['avatarId'] === 'number' && { avatarId: issueType['avatarId'] }),
                ...(typeof issueType['subtask'] === 'boolean' && { subtask: issueType['subtask'] }),
                ...(typeof issueType['hierarchyLevel'] === 'number' && { hierarchyLevel: issueType['hierarchyLevel'] }),
                ...(typeof issueType['entityId'] === 'string' && { entityId: issueType['entityId'] }),
                ...(issueType['scope'] !== null && typeof issueType['scope'] === 'object' && { scope: issueType['scope'] }),
                ...(typeof issueType['self'] === 'string' && { self: issueType['self'] })
            }));

        if (records.length > 0) {
            await nango.batchSave(records, 'IssueType');
        }

        await nango.trackDeletesEnd('IssueType');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
