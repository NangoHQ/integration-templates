import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    annotation_id: z.number().describe('The ID of the annotation to delete. Example: 12345')
});

const ProviderResponseSchema = z.object({
    success: z.boolean()
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a chart annotation',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://amplitude.com/docs/apis/analytics/chart-annotations
            endpoint: `/api/3/annotations/${encodeURIComponent(input.annotation_id)}`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            success: parsed.success
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
