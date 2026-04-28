import { createSync, ProxyConfiguration } from 'nango';
import { z } from 'zod';

const AsanaSectionSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string(),
    created_at: z.string(),
    project: z
        .object({
            gid: z.string(),
            resource_type: z.string(),
            name: z.string()
        })
        .optional()
});

const SectionSchema = z.object({
    id: z.string(),
    gid: z.string(),
    resource_type: z.string(),
    name: z.string(),
    created_at: z.string(),
    project: z
        .object({
            gid: z.string(),
            resource_type: z.string(),
            name: z.string()
        })
        .optional()
});

const MetadataSchema = z.object({
    project_ids: z.array(z.string())
});

const CheckpointSchema = z.object({
    project_index: z.number().int(),
    offset: z.string()
});

const sync = createSync({
    description: 'Sync sections for projects in scope',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/sections' }],
    checkpoint: CheckpointSchema,
    metadata: MetadataSchema,
    models: {
        Section: SectionSchema
    },

    exec: async (nango) => {
        const metadataRaw = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(metadataRaw);
        if (!metadataResult.success) {
            return;
        }
        const projectIds = metadataResult.data.project_ids;

        const checkpointRaw = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(checkpointRaw);
        const checkpoint = checkpointResult.success ? checkpointResult.data : { project_index: 0, offset: '' };
        const isFreshRun = !checkpointResult.success || checkpointRaw == null || checkpoint.project_index >= projectIds.length;
        let projectIndex = isFreshRun ? 0 : checkpoint.project_index;
        let offset = isFreshRun ? '' : checkpoint.offset;

        if (isFreshRun) {
            await nango.trackDeletesStart('Section');
            await nango.saveCheckpoint({ project_index: 0, offset: '' });
        }

        while (projectIndex < projectIds.length) {
            const projectId = projectIds[projectIndex];
            if (!projectId) {
                projectIndex++;
                continue;
            }

            const proxyConfig: ProxyConfiguration = {
                // https://developers.asana.com/reference/getsectionsforproject
                endpoint: `/projects/${encodeURIComponent(projectId)}/sections`,
                params: {
                    limit: 100,
                    opt_fields: 'gid,name,resource_type,created_at,project,project.name',
                    ...(offset && { offset })
                },
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'offset',
                    cursor_path_in_response: 'next_page.offset',
                    response_path: 'data',
                    limit_name_in_request: 'limit',
                    limit: 100,
                    on_page: async ({ nextPageParam }) => {
                        offset = typeof nextPageParam === 'string' ? nextPageParam : '';
                    }
                },
                retries: 3
            };

            for await (const page of nango.paginate(proxyConfig)) {
                const sections = [];
                for (const raw of page) {
                    const parsed = AsanaSectionSchema.safeParse(raw);
                    if (!parsed.success) {
                        throw new Error(`Invalid section payload: ${parsed.error.message}`);
                    }
                    const section = parsed.data;
                    sections.push({
                        id: section.gid,
                        gid: section.gid,
                        resource_type: section.resource_type,
                        name: section.name,
                        created_at: section.created_at,
                        ...(section.project && { project: section.project })
                    });
                }

                if (sections.length > 0) {
                    await nango.batchSave(sections, 'Section');
                }
            }

            projectIndex += 1;
            offset = '';
            await nango.saveCheckpoint({ project_index: projectIndex, offset });
        }

        await nango.trackDeletesEnd('Section');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
