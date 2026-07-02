import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    opportunityId: z.string().describe('The ID of the opportunity containing the feedback. Example: "6408dc54-7015-4e5b-8d60-23afff2b1efc"'),
    feedback: z.string().describe('The ID of the feedback form to delete. Example: "3b743e1d-d075-4ec6-a8d8-83ebf43e3263"'),
    performAs: z.string().describe('The ID of the user to perform this action as. Example: "be129d9b-50da-4485-9377-0d83e981f30b"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a feedback form from an opportunity.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://hire.lever.co/developer/documentation
        await nango.delete({
            endpoint: `/v1/opportunities/${encodeURIComponent(input.opportunityId)}/feedback/${encodeURIComponent(input.feedback)}`,
            params: {
                perform_as: input.performAs
            },
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
