import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    annotation_id: z.union([z.string(), z.number()]).describe('Annotation ID. Example: 12345')
});

const CategorySchema = z.object({
    id: z.number(),
    category: z.string()
});

const ProviderAnnotationSchema = z.object({
    id: z.number(),
    start: z.string(),
    label: z.string(),
    details: z.string().nullable().optional(),
    category: CategorySchema.nullable().optional(),
    end: z.string().nullable().optional(),
    chart_id: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    start: z.string(),
    label: z.string(),
    details: z.string().optional(),
    category: CategorySchema.optional(),
    end: z.string().optional(),
    chart_id: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a chart annotation.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-annotation',
        group: 'Annotations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const annotationId = String(input.annotation_id);

        const response = await nango.get({
            // https://amplitude.com/docs/apis/analytics/chart-annotations
            endpoint: `/api/3/annotations/${encodeURIComponent(annotationId)}`,
            retries: 3
        });

        const envelope = z
            .object({
                data: ProviderAnnotationSchema
            })
            .parse(response.data);

        const providerAnnotation = envelope.data;

        return {
            id: providerAnnotation.id,
            start: providerAnnotation.start,
            label: providerAnnotation.label,
            ...(providerAnnotation.details != null && { details: providerAnnotation.details }),
            ...(providerAnnotation.category != null && { category: providerAnnotation.category }),
            ...(providerAnnotation.end != null && { end: providerAnnotation.end }),
            ...(providerAnnotation.chart_id != null && { chart_id: providerAnnotation.chart_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
