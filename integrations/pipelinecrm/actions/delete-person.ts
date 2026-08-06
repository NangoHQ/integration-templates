import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    person_id: z.number().describe('The ID of the person to delete. Example: 1309859837')
});

const OutputSchema = z.object({
    person_id: z.number(),
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a person.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: `/api/v3/people/${encodeURIComponent(input.person_id)}`,
            retries: 1
        });

        return {
            person_id: input.person_id,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
