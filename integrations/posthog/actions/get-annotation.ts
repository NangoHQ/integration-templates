import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.number().describe('PostHog project ID. Example: 309484'),
    id: z.number().describe('Annotation ID. Example: 339256')
});

const CreatedBySchema = z.object({
    id: z.number(),
    uuid: z.string(),
    distinct_id: z.string(),
    first_name: z.string(),
    email: z.string().email()
});

const ProviderAnnotationSchema = z.object({
    id: z.number(),
    content: z.string(),
    date_marker: z.string().datetime().nullable().optional(),
    scope: z.string().optional(),
    creation_type: z.string().optional(),
    created_at: z.string().datetime().optional(),
    updated_at: z.string().datetime().optional(),
    dashboard_item: z.number().nullable().optional(),
    created_by: CreatedBySchema.nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    content: z.string(),
    date_marker: z.string().datetime().nullable().optional(),
    scope: z.string().optional(),
    creation_type: z.string().optional(),
    created_at: z.string().datetime().optional(),
    updated_at: z.string().datetime().optional(),
    dashboard_item: z.number().nullable().optional(),
    created_by: CreatedBySchema.nullable().optional()
});

const action = createAction({
    description: 'Retrieve a single annotation from PostHog.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-annotation',
        group: 'Annotations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['annotation:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://posthog.com/docs/api/annotations
            endpoint: `/api/projects/${encodeURIComponent(String(input.project_id))}/annotations/${encodeURIComponent(String(input.id))}/`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Annotation not found',
                annotation_id: input.id,
                project_id: input.project_id
            });
        }

        const annotation = ProviderAnnotationSchema.parse(response.data);

        return {
            id: annotation.id,
            content: annotation.content,
            ...(annotation.date_marker !== undefined && { date_marker: annotation.date_marker }),
            ...(annotation.scope !== undefined && { scope: annotation.scope }),
            ...(annotation.creation_type !== undefined && { creation_type: annotation.creation_type }),
            ...(annotation.created_at !== undefined && { created_at: annotation.created_at }),
            ...(annotation.updated_at !== undefined && { updated_at: annotation.updated_at }),
            ...(annotation.dashboard_item !== undefined && { dashboard_item: annotation.dashboard_item }),
            ...(annotation.created_by !== undefined && { created_by: annotation.created_by })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
