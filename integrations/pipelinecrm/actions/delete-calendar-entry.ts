import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Calendar entry ID. Example: 355945770')
});

const OutputSchema = z.object({
    id: z.number(),
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a calendar entry.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://app.pipelinecrm.com/api/docs/introduction
            baseUrlOverride: 'https://api.pipelinecrm.com/api/v3',
            endpoint: `calendar_entries/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Calendar entry not found',
                id: input.id
            });
        }

        return {
            id: input.id,
            success: response.status === 204
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
