import { createAction } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({
    categoryId: z.number().describe('The ID of the annotation category to delete')
});

const OutputSchema = z.object({
    success: z.boolean()
});

export default createAction({
    description: 'Delete an annotation category',
    version: '0.0.1',
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input) => {
        // https://amplitude.com/docs/apis/analytics/chart-annotations
        const response = await nango.delete({
            endpoint: `/api/3/annotation-categories/${encodeURIComponent(input.categoryId)}`,
            retries: 3
        });

        const DeleteResponseSchema = z.object({
            success: z.boolean()
        });

        const parsed = DeleteResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                message: 'Unexpected response from Amplitude API when deleting annotation category',
                response: response.data
            });
        }

        return { success: parsed.data.success };
    }
});
