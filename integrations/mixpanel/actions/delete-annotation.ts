import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    projectId: z.string().describe('Mixpanel project ID. Example: "4040293"'),
    annotationId: z.string().describe('Annotation ID to delete. Example: "2004052"')
});

const ProviderResponseSchema = z.object({
    status: z.string(),
    results: z.object({
        id: z.number()
    })
});

const OutputSchema = z.object({
    id: z.number(),
    status: z.string()
});

const action = createAction({
    description: 'Delete a project annotation.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.mixpanel.com/reference/delete-annotation-1
        const response = await nango.delete({
            endpoint: `/api/app/projects/${encodeURIComponent(input.projectId)}/annotations/${encodeURIComponent(input.annotationId)}`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.results.id,
            status: providerResponse.status
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
