import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('Mixpanel project ID. Example: "4040293"'),
    date: z.string().describe('Annotation date in YYYY-MM-DD HH:MM:SS format. Example: "2026-07-03 12:00:00"'),
    description: z.string().describe('Annotation description. Example: "Release v1.2.0"')
});

const ProviderAnnotationSchema = z.object({
    id: z.union([z.string(), z.number()]),
    date: z.string().optional(),
    description: z.string().optional(),
    project_id: z.union([z.string(), z.number()]).optional()
});

const ProviderResponseSchema = z.object({
    status: z.string(),
    results: ProviderAnnotationSchema
});

const OutputSchema = z.object({
    id: z.string(),
    date: z.string().optional(),
    description: z.string().optional(),
    project_id: z.string().optional()
});

const action = createAction({
    description: 'Create a project annotation',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.mixpanel.com/reference/create-annotation
            endpoint: `/api/app/projects/${encodeURIComponent(input.project_id)}/annotations`,
            data: {
                date: input.date,
                description: input.description
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const providerAnnotation = providerResponse.results;

        return {
            id: String(providerAnnotation.id),
            ...(providerAnnotation.date != null && { date: providerAnnotation.date }),
            ...(providerAnnotation.description != null && { description: providerAnnotation.description }),
            ...(providerAnnotation.project_id != null && { project_id: String(providerAnnotation.project_id) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
