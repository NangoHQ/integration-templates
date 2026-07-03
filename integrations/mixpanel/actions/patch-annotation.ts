import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.number().describe('Your project id (eg: 12345)'),
    annotation_id: z.number().describe('The id of the annotation'),
    description: z.string().optional().describe('The text that will be shown when looking at the annotation'),
    tags: z.array(z.number()).optional().describe('The ids of the tags to be added to the annotation')
});

const ProviderTagSchema = z.object({
    id: z.number(),
    name: z.string()
});

const ProviderUserSchema = z.object({
    id: z.number(),
    first_name: z.string().optional(),
    last_name: z.string().optional()
});

const ProviderAnnotationSchema = z.object({
    date: z.string().optional(),
    description: z.string().optional(),
    id: z.number(),
    user: ProviderUserSchema.optional(),
    tags: z.array(ProviderTagSchema).optional()
});

const ProviderResponseSchema = z.object({
    status: z.string(),
    results: ProviderAnnotationSchema
});

const OutputSchema = z.object({
    id: z.number(),
    date: z.string().optional(),
    description: z.string().optional(),
    user: z
        .object({
            id: z.number(),
            first_name: z.string().optional(),
            last_name: z.string().optional()
        })
        .optional(),
    tags: z.array(ProviderTagSchema).optional()
});

const action = createAction({
    description: 'Patch a project annotation.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://developer.mixpanel.com/reference/patch-annotation-1
            endpoint: `/api/app/projects/${encodeURIComponent(String(input.project_id))}/annotations/${encodeURIComponent(String(input.annotation_id))}`,
            data: {
                ...(input.description !== undefined && { description: input.description }),
                ...(input.tags !== undefined && { tags: input.tags })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const result = providerResponse.results;

        return {
            id: result.id,
            ...(result.date !== undefined && { date: result.date }),
            ...(result.description !== undefined && { description: result.description }),
            ...(result.user !== undefined && {
                user: {
                    id: result.user.id,
                    ...(result.user.first_name !== undefined && { first_name: result.user.first_name }),
                    ...(result.user.last_name !== undefined && { last_name: result.user.last_name })
                }
            }),
            ...(result.tags !== undefined && {
                tags: result.tags.map((tag) => ({
                    id: tag.id,
                    name: tag.name
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
