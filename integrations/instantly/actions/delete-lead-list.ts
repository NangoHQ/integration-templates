import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Lead list ID to delete. Example: "5c194eae-9382-4bf1-aff4-d9eaa90668e1"')
});

const OutputSchema = z.object({
    id: z.string(),
    success: z.boolean()
});

const ProviderDeleteResponseSchema = z
    .object({
        status: z.string().optional(),
        message: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Delete a lead list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.instantly.ai/api-reference/groups/lead-list
        const response = await nango.delete({
            endpoint: `/v2/lead-lists/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const statusCode = typeof response.status === 'number' ? response.status : Number(response.status);

        if (statusCode >= 200 && statusCode < 300) {
            return {
                id: input.id,
                success: true
            };
        }

        const parsed = ProviderDeleteResponseSchema.safeParse(response.data);

        throw new nango.ActionError({
            type: 'delete_failed',
            message: parsed.success ? parsed.data.message || 'Delete failed' : 'Delete failed',
            status_code: statusCode
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
