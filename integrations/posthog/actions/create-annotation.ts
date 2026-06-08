import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.number().describe('PostHog project ID. Example: 309484'),
    content: z.string().describe('Annotation content. Example: "Deployment v1.2.0"'),
    date_marker: z.string().optional().describe('ISO 8601 timestamp for the annotation. Example: "2024-01-15T10:00:00Z"'),
    creation_type: z.string().optional().describe('Creation type. Example: "USR"'),
    dashboard_item: z.number().nullable().optional().describe('Dashboard item ID to associate with the annotation.'),
    dashboard_id: z.number().nullable().optional().describe('Dashboard ID to associate with the annotation.'),
    deleted: z.boolean().optional().describe('Whether the annotation is deleted.'),
    scope: z.string().optional().describe('Scope of the annotation. Example: "dashboard_item" or "project"')
});

const CreatedBySchema = z.object({
    id: z.number(),
    uuid: z.string(),
    distinct_id: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
    is_email_verified: z.boolean(),
    hedgehog_config: z.unknown(),
    role_at_organization: z.string()
});

const ProviderAnnotationSchema = z.object({
    id: z.number(),
    content: z.string().nullable(),
    date_marker: z.string().nullable(),
    creation_type: z.string(),
    dashboard_item: z.number().nullable(),
    dashboard_id: z.number().nullable(),
    dashboard_name: z.string().nullable(),
    insight_short_id: z.string().nullable(),
    insight_name: z.string().nullable(),
    insight_derived_name: z.string().nullable(),
    created_by: CreatedBySchema,
    created_at: z.string(),
    updated_at: z.string(),
    deleted: z.boolean(),
    scope: z.string()
});

const OutputSchema = z.object({
    id: z.number(),
    content: z.string().nullable().optional(),
    date_marker: z.string().nullable().optional(),
    creation_type: z.string().optional(),
    dashboard_item: z.number().nullable().optional(),
    dashboard_id: z.number().nullable().optional(),
    dashboard_name: z.string().nullable().optional(),
    insight_short_id: z.string().nullable().optional(),
    insight_name: z.string().nullable().optional(),
    insight_derived_name: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    deleted: z.boolean().optional(),
    scope: z.string().optional()
});

const action = createAction({
    description: 'Create an annotation in PostHog.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-annotation',
        group: 'Annotations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['annotation:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://posthog.com/docs/api/annotations
            endpoint: `/api/projects/${encodeURIComponent(input.project_id)}/annotations/`,
            data: {
                content: input.content,
                ...(input.date_marker !== undefined && { date_marker: input.date_marker }),
                ...(input.creation_type !== undefined && { creation_type: input.creation_type }),
                ...(input.dashboard_item !== undefined && { dashboard_item: input.dashboard_item }),
                ...(input.dashboard_id !== undefined && { dashboard_id: input.dashboard_id }),
                ...(input.deleted !== undefined && { deleted: input.deleted }),
                ...(input.scope !== undefined && { scope: input.scope })
            },
            retries: 3
        });

        const providerAnnotation = ProviderAnnotationSchema.parse(response.data);

        return {
            id: providerAnnotation.id,
            ...(providerAnnotation.content !== null && { content: providerAnnotation.content }),
            ...(providerAnnotation.date_marker !== null && { date_marker: providerAnnotation.date_marker }),
            ...(providerAnnotation.creation_type !== undefined && { creation_type: providerAnnotation.creation_type }),
            ...(providerAnnotation.dashboard_item !== null && { dashboard_item: providerAnnotation.dashboard_item }),
            ...(providerAnnotation.dashboard_id !== null && { dashboard_id: providerAnnotation.dashboard_id }),
            ...(providerAnnotation.dashboard_name !== null && { dashboard_name: providerAnnotation.dashboard_name }),
            ...(providerAnnotation.insight_short_id !== null && { insight_short_id: providerAnnotation.insight_short_id }),
            ...(providerAnnotation.insight_name !== null && { insight_name: providerAnnotation.insight_name }),
            ...(providerAnnotation.insight_derived_name !== null && { insight_derived_name: providerAnnotation.insight_derived_name }),
            ...(providerAnnotation.created_at !== undefined && { created_at: providerAnnotation.created_at }),
            ...(providerAnnotation.updated_at !== undefined && { updated_at: providerAnnotation.updated_at }),
            ...(providerAnnotation.deleted !== undefined && { deleted: providerAnnotation.deleted }),
            ...(providerAnnotation.scope !== undefined && { scope: providerAnnotation.scope })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
