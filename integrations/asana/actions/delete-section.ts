import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    section_gid: z.string().min(1).describe('The globally unique identifier for the section. Example: "1234567890"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a section by gid.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.asana.com/reference/deletesection
        await nango.delete({
            endpoint: `/api/1.0/sections/${encodeURIComponent(input.section_gid)}`,
            retries: 1
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
