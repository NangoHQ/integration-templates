import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    milestone_id: z.number().int().describe('The unique ID of the Milestone (Objective) to delete. Example: 43')
});

const OutputSchema = z.object({
    success: z.boolean(),
    milestone_id: z.number()
});

const action = createAction({
    description: 'Delete an Objective',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://developer.shortcut.com/api/rest/v3#Delete-Milestone
            endpoint: `/api/v3/milestones/${encodeURIComponent(input.milestone_id)}`,
            retries: 3
        });

        return {
            success: true,
            milestone_id: input.milestone_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
