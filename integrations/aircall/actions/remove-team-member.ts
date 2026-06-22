import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    team_id: z.number().describe('Team ID. Example: 244844'),
    user_id: z.number().describe('User ID. Example: 1981305')
});

const ProviderTeamSchema = z
    .object({
        id: z.number(),
        name: z.string(),
        direct_link: z.string().optional(),
        created_at: z.string().optional(),
        users: z
            .array(
                z
                    .object({
                        id: z.number(),
                        direct_link: z.string().optional(),
                        name: z.string().optional(),
                        email: z.string().optional(),
                        availability_status: z.string().optional(),
                        default_number_id: z.number().optional(),
                        created_at: z.string().optional(),
                        time_zone: z.string().optional()
                    })
                    .passthrough()
            )
            .optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.number(),
        name: z.string(),
        direct_link: z.string().optional(),
        created_at: z.string().optional(),
        users: z.array(z.unknown()).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Remove a user from an Aircall team',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/remove-team-member'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['team:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developer.aircall.io/api-references/#remove-a-user-from-a-team
            endpoint: `/v1/teams/${encodeURIComponent(input.team_id)}/users/${encodeURIComponent(input.user_id)}`,
            retries: 1
        });

        const wrapper = z
            .object({
                team: ProviderTeamSchema
            })
            .parse(response.data);

        return wrapper.team;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
