import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Document ID. Example: 192568972')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a document.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: `/api/v3/documents/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        if (response.status !== 204) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: `Unexpected status ${response.status} when deleting document ${input.id}.`
            });
        }

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
