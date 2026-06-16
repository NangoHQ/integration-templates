import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    label: z.string().describe('The title of the annotation. Example: "Feature X Release"'),
    start: z.string().describe('The start timestamp of the annotation in ISO 8601 format. Example: "2025-11-01T07:00:00+00:00"'),
    category: z.string().optional().describe('The name of the category that the annotation belongs to. Example: "Releases"'),
    chart_id: z.string().optional().describe('The ID of the chart to annotate. If omitted, the annotation is global. Example: "abc123"'),
    details: z.string().optional().describe('Details for the annotation. Example: "This marks the release of feature X"'),
    end: z.string().optional().describe('The end timestamp of the annotation in ISO 8601 format. Example: "2025-11-10T07:00:00+01:00"')
});

const ProviderCategorySchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    category: z.string().optional()
});

const ProviderAnnotationSchema = z.object({
    id: z.number(),
    start: z.string(),
    details: z.string().nullable().optional(),
    category: ProviderCategorySchema.nullable().optional(),
    end: z.string().nullable().optional(),
    label: z.string(),
    chart_id: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    data: ProviderAnnotationSchema
});

const OutputSchema = z.object({
    id: z.number(),
    start: z.string(),
    details: z.string().optional(),
    category: z
        .object({
            id: z.number(),
            name: z.string().optional()
        })
        .optional(),
    end: z.string().optional(),
    label: z.string(),
    chart_id: z.string().optional()
});

const action = createAction({
    description: 'Create a chart annotation.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-annotation',
        group: 'Annotations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionConfig = connection.connection_config;
        const hostname =
            typeof connectionConfig === 'object' &&
            connectionConfig !== null &&
            'hostname' in connectionConfig &&
            typeof connectionConfig['hostname'] === 'string'
                ? connectionConfig['hostname']
                : 'amplitude.com';
        const baseUrl = `https://${hostname}`;

        const requestBody: Record<string, unknown> = {
            label: input.label,
            start: input.start
        };

        if (input.category !== undefined) {
            requestBody['category'] = input.category;
        }
        if (input.chart_id !== undefined) {
            requestBody['chart_id'] = input.chart_id;
        }
        if (input.details !== undefined) {
            requestBody['details'] = input.details;
        }
        if (input.end !== undefined) {
            requestBody['end'] = input.end;
        }

        // https://amplitude.com/docs/apis/analytics/chart-annotations#create-an-annotation
        const response = await nango.post({
            endpoint: '/api/3/annotations',
            baseUrlOverride: baseUrl,
            data: requestBody,
            retries: 3
        });

        const rawResponse = ProviderResponseSchema.safeParse(response.data);
        if (!rawResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The provider returned an unexpected response.',
                issues: rawResponse.error.issues
            });
        }

        const annotation = rawResponse.data.data;

        return {
            id: annotation.id,
            start: annotation.start,
            label: annotation.label,
            ...(annotation.details != null && { details: annotation.details }),
            ...(annotation.category != null && {
                category: {
                    id: annotation.category.id,
                    name: annotation.category.name ?? annotation.category.category
                }
            }),
            ...(annotation.end != null && { end: annotation.end }),
            ...(annotation.chart_id != null && { chart_id: annotation.chart_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
