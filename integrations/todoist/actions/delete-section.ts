import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    section_id: z.string().describe('The ID of the section to delete. Example: "6h78Pf2Vf8WCMH2q"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a section.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data:delete'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://developer.todoist.com/api/v1/#delete-a-section
            endpoint: `/api/v1/sections/${encodeURIComponent(input.section_id)}`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
