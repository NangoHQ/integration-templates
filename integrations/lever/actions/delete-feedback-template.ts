import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Feedback template ID. Example: "1c0d54d3-1aeb-4989-b616-d0a6025444e8"')
});

const ProviderResponseSchema = z
    .object({
        id: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a feedback template.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://hire.lever.co/developer/documentation
            endpoint: `/v1/feedback_templates/${encodeURIComponent(input.id)}`,
            retries: 1
        });

        const providerData = response.data ? ProviderResponseSchema.safeParse(response.data) : null;
        const responseId = providerData?.success ? providerData.data.id : null;

        return {
            id: responseId || input.id,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
