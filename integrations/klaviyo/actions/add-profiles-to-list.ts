import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    listId: z.string().describe('The ID of the list to add profiles to. Example: "XW53Ha"'),
    profileIds: z.array(z.string()).min(1).describe('Array of profile IDs to add to the list. Example: ["01KWFX4MZPQDSD3YG79C83CBDV"]')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Add profiles to a list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.klaviyo.com/en/reference/create_list_relationships
        await nango.post({
            endpoint: `/api/lists/${encodeURIComponent(input.listId)}/relationships/profiles`,
            data: {
                data: input.profileIds.map((id) => ({
                    type: 'profile',
                    id
                }))
            },
            headers: {
                revision: '2026-04-15'
            },
            retries: 1
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
