import { createSync } from 'nango';
import { z } from 'zod';

const ProviderAnnotationSchema = z.object({
    date: z.string(),
    description: z.string().optional(),
    id: z.number(),
    user: z
        .object({
            id: z.number(),
            first_name: z.string().optional(),
            last_name: z.string().optional()
        })
        .optional(),
    tags: z
        .array(
            z.object({
                id: z.number(),
                name: z.string()
            })
        )
        .optional()
});

const AnnotationSchema = z.object({
    id: z.string(),
    date: z.string(),
    description: z.string().optional(),
    user_id: z.number().optional(),
    user_first_name: z.string().optional(),
    user_last_name: z.string().optional(),
    tags: z
        .array(
            z.object({
                id: z.number(),
                name: z.string()
            })
        )
        .optional()
});

const ProjectSchema = z.object({
    id: z.number(),
    name: z.string().optional()
});

const ProjectsResponseSchema = z.object({
    status: z.string().optional(),
    results: z.array(z.unknown()).optional(),
    projects: z.array(z.unknown()).optional()
});

const AnnotationsResponseSchema = z.object({
    status: z.string().optional(),
    results: z.array(ProviderAnnotationSchema).optional()
});

const CheckpointSchema = z.object({
    next_project_id: z.string()
});

const ANNOTATIONS_HISTORY_START = '1970-01-01';

const sync = createSync({
    description: 'Sync annotations.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Annotation: AnnotationSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointParse = CheckpointSchema.safeParse(rawCheckpoint ?? {});
        const checkpoint: z.infer<typeof CheckpointSchema> = checkpointParse.success ? checkpointParse.data : { next_project_id: '' };
        const toDate = new Date().toISOString().split('T')[0] || '';
        const fromDate = ANNOTATIONS_HISTORY_START;

        // https://developer.mixpanel.com/reference/overview-1
        const projectsResponse = await nango.get({
            endpoint: '/api/app/projects',
            retries: 3
        });

        const projectsData = ProjectsResponseSchema.safeParse(projectsResponse.data);
        if (!projectsData.success) {
            throw new Error('Failed to parse projects response');
        }

        const rawProjects = projectsData.data.results ?? projectsData.data.projects ?? [];
        const projectsParse = z.array(ProjectSchema).safeParse(rawProjects);
        if (!projectsParse.success) {
            throw new Error('Failed to parse projects array');
        }

        const projectIds = [...new Set(projectsParse.data.map((project) => String(project.id)))].sort();

        if (projectIds.length === 0) {
            return;
        }

        const checkpointIndex = checkpoint.next_project_id ? projectIds.indexOf(checkpoint.next_project_id) : 0;
        const startIndex = checkpointIndex >= 0 ? checkpointIndex : 0;

        await nango.trackDeletesStart('Annotation');

        for (let index = startIndex; index < projectIds.length; index++) {
            const projectId = projectIds[index];
            if (!projectId) {
                continue;
            }

            // https://developer.mixpanel.com/reference/list-all-annotations-for-project
            const annotationsResponse = await nango.get({
                endpoint: `/api/app/projects/${encodeURIComponent(projectId)}/annotations`,
                params: {
                    fromDate,
                    toDate
                },
                retries: 3
            });

            const annotationsData = AnnotationsResponseSchema.safeParse(annotationsResponse.data);
            if (!annotationsData.success) {
                throw new Error('Failed to parse annotations response');
            }

            const annotations = (annotationsData.data.results ?? []).map((annotation) => ({
                id: String(annotation.id),
                date: annotation.date,
                ...(annotation.description != null && { description: annotation.description }),
                ...(annotation.user?.id != null && { user_id: annotation.user.id }),
                ...(annotation.user?.first_name != null && { user_first_name: annotation.user.first_name }),
                ...(annotation.user?.last_name != null && { user_last_name: annotation.user.last_name }),
                ...(annotation.tags != null && { tags: annotation.tags })
            }));

            if (annotations.length > 0) {
                await nango.batchSave(annotations, 'Annotation');
            }

            const nextProjectId = projectIds[index + 1];
            if (nextProjectId) {
                await nango.saveCheckpoint({ next_project_id: nextProjectId });
            }
        }

        await nango.trackDeletesEnd('Annotation');

        await nango.saveCheckpoint({ next_project_id: '' });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
