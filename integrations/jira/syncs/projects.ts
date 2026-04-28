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

const CheckpointSchema = z.object({
    offset: z.number()
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

const ProviderResponseSchema = z.object({
    values: z.array(ProviderProjectSchema),
    startAt: z.number(),
    maxResults: z.number(),
    total: z.number(),
    isLast: z.boolean().optional(),
    nextPage: z.string().optional()
});

const sync = createSync({
    description: 'Sync Jira projects accessible to the authenticated user.',
    version: '2.0.0',
    endpoints: [{ method: 'POST', path: '/syncs/projects' }],
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',
    checkpoint: CheckpointSchema,
    models: {
        Project: ProjectSchema
    },

    exec: async (nango) => {
        const parsedCheckpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        const initialOffset = parsedCheckpoint.success ? parsedCheckpoint.data.offset : 0;

        const connection = await nango.getConnection();
        let cloudId = connection.connection_config?.['cloudId'];
        let baseUrl = connection.connection_config?.['baseUrl'];

        // Fallback to metadata if not in connection_config
        if (!cloudId || !baseUrl) {
            const metadata = await nango.getMetadata();
            cloudId = cloudId || metadata?.['cloudId'];
            baseUrl = baseUrl || metadata?.['baseUrl'];
        }

        if (!cloudId) {
            throw new Error('cloudId is required in connection configuration or metadata');
        }

        await nango.trackDeletesStart('Project');

        let currentOffset = initialOffset;
        let isLast = false;
        let sawProjectsInRun = false;
        let resumedFromCheckpoint = initialOffset > 0;

        while (!isLast) {
            // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-projects/#api-rest-api-3-project-search-get
            const response = await nango.get({
                endpoint: `/ex/jira/${cloudId}/rest/api/3/project/search`,
                params: {
                    startAt: currentOffset,
                    maxResults: 50
                },
                retries: 3
            });

            const parsed = ProviderResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse response: ${parsed.error.message}`);
            }

            const data = parsed.data;

            if (data.values.length === 0) {
                // A stale end-of-run checkpoint would otherwise make the next run look empty
                // and incorrectly mark previously synced projects as deleted.
                if (resumedFromCheckpoint && !sawProjectsInRun) {
                    currentOffset = 0;
                    resumedFromCheckpoint = false;
                    await nango.saveCheckpoint({ offset: 0 });
                    continue;
                }

                isLast = true;
                break;
            }

            sawProjectsInRun = true;

            const projects = data.values.map((project) => ({
                id: project.id,
                key: project.key,
                name: project.name,
                project_type_key: project.projectTypeKey,
                simplified: project.simplified,
                style: project.style,
                is_private: project.isPrivate,
                entity_id: project.entityId,
                uuid: project.uuid,
                lead: project.lead
                    ? {
                          account_id: project.lead.accountId,
                          display_name: project.lead.displayName
                      }
                    : undefined,
                url: project.url,
                project_category: project.projectCategory
                    ? {
                          id: project.projectCategory.id,
                          name: project.projectCategory.name,
                          description: project.projectCategory.description
                      }
                    : undefined,
                avatar_urls: project.avatarUrls
            }));

            await nango.batchSave(projects, 'Project');

            isLast = data.isLast ?? false;

            if (!isLast && data.nextPage) {
                const url = new URL(data.nextPage);
                const nextStartAt = url.searchParams.get('startAt');
                currentOffset = nextStartAt ? parseInt(nextStartAt, 10) : currentOffset + data.maxResults;
            } else if (!isLast) {
                currentOffset = currentOffset + data.maxResults;
            }

            await nango.saveCheckpoint({
                offset: currentOffset
            });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Project');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
