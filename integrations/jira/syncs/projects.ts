import { createSync } from 'nango';
import { z } from 'zod';

const ProjectSchema = z.object({
    id: z.string(),
    key: z.string(),
    name: z.string(),
    project_type_key: z.string().optional(),
    simplified: z.boolean().optional(),
    style: z.string().optional(),
    is_private: z.boolean().optional(),
    entity_id: z.string().optional(),
    uuid: z.string().optional(),
    lead: z
        .object({
            account_id: z.string().optional(),
            display_name: z.string().optional()
        })
        .optional(),
    url: z.string().optional(),
    project_category: z
        .object({
            id: z.string(),
            name: z.string(),
            description: z.string().optional()
        })
        .optional(),
    avatar_urls: z.record(z.string(), z.string()).optional()
});

const ProviderProjectSchema = z.object({
    id: z.string(),
    key: z.string(),
    name: z.string(),
    projectTypeKey: z.string().optional(),
    simplified: z.boolean().optional(),
    style: z.string().optional(),
    isPrivate: z.boolean().optional(),
    entityId: z.string().optional(),
    uuid: z.string().optional(),
    lead: z
        .object({
            accountId: z.string().optional(),
            displayName: z.string().optional()
        })
        .optional(),
    url: z.string().optional(),
    projectCategory: z
        .object({
            id: z.string(),
            name: z.string(),
            description: z.string().optional()
        })
        .optional(),
    avatarUrls: z.record(z.string(), z.string()).optional()
});

const sync = createSync({
    description: 'Sync Jira projects accessible to the authenticated user.',
    version: '2.0.1',
    endpoints: [{ method: 'POST', path: '/syncs/projects' }],
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',
    models: {
        Project: ProjectSchema
    },

    exec: async (nango) => {
        const connection = await nango.getConnection();
        let cloudId = connection.connection_config?.['cloudId'];
        let baseUrl = connection.connection_config?.['baseUrl'];

        if (!cloudId || !baseUrl) {
            const metadata = await nango.getMetadata();
            cloudId = cloudId || metadata?.['cloudId'];
            baseUrl = baseUrl || metadata?.['baseUrl'];
        }

        if (!cloudId) {
            throw new Error('cloudId is required in connection configuration or metadata');
        }

        await nango.trackDeletesStart('Project');

        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-projects/#api-rest-api-3-project-search-get
        for await (const rawProjects of nango.paginate<unknown>({
            endpoint: `/ex/jira/${cloudId}/rest/api/3/project/search`,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'startAt',
                limit_name_in_request: 'maxResults',
                limit: 50,
                response_path: 'values',
                offset_calculation_method: 'by-response-size'
            },
            retries: 3
        })) {
            const parsed = z.array(ProviderProjectSchema).safeParse(rawProjects);
            if (!parsed.success) {
                throw new Error(`Failed to parse Jira projects: ${parsed.error.message}`);
            }

            if (parsed.data.length === 0) continue;

            await nango.batchSave(
                parsed.data.map((project) => ({
                    id: project.id,
                    key: project.key,
                    name: project.name,
                    project_type_key: project.projectTypeKey,
                    simplified: project.simplified,
                    style: project.style,
                    is_private: project.isPrivate,
                    entity_id: project.entityId,
                    uuid: project.uuid,
                    lead: project.lead ? { account_id: project.lead.accountId, display_name: project.lead.displayName } : undefined,
                    url: project.url,
                    project_category: project.projectCategory
                        ? {
                              id: project.projectCategory.id,
                              name: project.projectCategory.name,
                              description: project.projectCategory.description
                          }
                        : undefined,
                    avatar_urls: project.avatarUrls
                })),
                'Project'
            );
        }

        await nango.trackDeletesEnd('Project');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
