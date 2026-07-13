import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    epic_public_id: z.number().int().describe('The public ID of the epic to delete. Example: 26')
});

const OutputSchema = z.object({
    success: z.boolean(),
    epic_public_id: z.number()
});

const action = createAction({
    description: 'Delete an epic.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://developer.shortcut.com/api/rest/v3#Delete-Epic
            endpoint: `/api/v3/epics/${encodeURIComponent(String(input.epic_public_id))}`,
            retries: 1
        });

        return {
            success: true,
            epic_public_id: input.epic_public_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
