import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    annotation_id: z.number().describe('The ID of the annotation to update. Example: 939879'),
    label: z.string().optional().describe('The title of the annotation.'),
    start: z.string().optional().describe('Timestamp for the start of the annotation in ISO 8601 format. Example: "2026-06-16T00:00:00+00:00"'),
    category: z.string().optional().describe('The name of the category that the annotation belongs to.'),
    chart_id: z.string().nullable().optional().describe('The ID of the chart to annotate. Set to null to make the annotation global.'),
    details: z.string().optional().describe('Details for the annotation.'),
    end: z
        .string()
        .nullable()
        .optional()
        .describe('Timestamp for the end of the annotation in ISO 8601 format. Set to null to remove the end time. Example: "2026-06-16T23:59:59+00:00"')
});

const ProviderCategorySchema = z.object({
    id: z.number(),
    category: z.string()
});

const ProviderAnnotationSchema = z.object({
    id: z.number(),
    start: z.string(),
    label: z.string(),
    details: z.string().nullable(),
    category: ProviderCategorySchema,
    end: z.string().nullable(),
    chart_id: z.string().nullable()
});

const ProviderResponseSchema = z.object({
    data: ProviderAnnotationSchema
});

const OutputSchema = z.object({
    id: z.number(),
    start: z.string(),
    label: z.string(),
    details: z.string().optional(),
    category: z.object({
        id: z.number(),
        category: z.string()
    }),
    end: z.string().optional(),
    chart_id: z.string().optional()
});

const action = createAction({
    description: 'Update a chart annotation.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-annotation',
        group: 'Annotations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};
        if (input.label !== undefined) {
            body['label'] = input.label;
        }
        if (input.start !== undefined) {
            body['start'] = input.start;
        }
        if (input.category !== undefined) {
            body['category'] = input.category;
        }
        if (input.chart_id !== undefined) {
            body['chart_id'] = input.chart_id;
        }
        if (input.details !== undefined) {
            body['details'] = input.details;
        }
        if (input.end !== undefined) {
            body['end'] = input.end;
        }

        const response = await nango.put({
            // https://amplitude.com/docs/apis/analytics/chart-annotations#update-an-annotation
            endpoint: `/api/3/annotations/${encodeURIComponent(input.annotation_id)}`,
            data: body,
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response shape.',
                details: parsed.error.issues
            });
        }

        const annotation = parsed.data.data;
        return {
            id: annotation.id,
            start: annotation.start,
            label: annotation.label,
            ...(annotation.details != null && { details: annotation.details }),
            category: annotation.category,
            ...(annotation.end != null && { end: annotation.end }),
            ...(annotation.chart_id != null && { chart_id: annotation.chart_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
