import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Lead source ID. Example: 3627032')
});

const OutputSchema = z.object({
    id: z.number()
});

const action = createAction({
    description: 'Delete a lead source.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: `/api/v3/admin/lead_sources/${encodeURIComponent(input.id)}.json`,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Lead source with id ${input.id} not found`,
                id: input.id
            });
        }

        return {
            id: input.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
