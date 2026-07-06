import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    list_id: z.string().describe('The list ID. Example: "XW53Ha"'),
    profile_ids: z.array(z.string()).max(1000).describe('Profile IDs to remove from the list. Maximum 1000 per call.')
});

const OutputSchema = z.object({
    list_id: z.string(),
    removed_profile_ids: z.array(z.string())
});

const action = createAction({
    description: 'Remove profiles from a list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['lists:write', 'profiles:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.klaviyo.com/en/reference/remove_profiles_from_list
        await nango.delete({
            endpoint: `/api/lists/${encodeURIComponent(input.list_id)}/relationships/profiles`,
            data: {
                data: input.profile_ids.map((id) => ({
                    type: 'profile',
                    id: id
                }))
            },
            headers: {
                revision: '2026-04-15'
            },
            retries: 3
        });

        return {
            list_id: input.list_id,
            removed_profile_ids: input.profile_ids
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
