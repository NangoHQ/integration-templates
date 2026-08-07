import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dealId: z.number().describe('Deal ID. Example: 55383278')
});

const OutputSchema = z.object({
    id: z.number(),
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a deal.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://app.pipelinecrm.com/api/docs/introduction
        await nango.delete({
            endpoint: `api/v3/deals/${encodeURIComponent(input.dealId)}.json`,
            retries: 10
        });

        return {
            id: input.dealId,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
