import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    team_id: z.number().describe('Team ID. Example: 244844')
});

const TeamUserSchema = z
    .object({
        id: z.number(),
        direct_link: z.string().optional(),
        name: z.string().optional(),
        email: z.string().optional(),
        created_at: z.string().optional(),
        time_zone: z.string().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.number(),
        direct_link: z.string().optional(),
        name: z.string().optional(),
        created_at: z.string().optional(),
        users: z.array(TeamUserSchema).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a single team from Aircall.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.aircall.io/api-references/#retrieve-a-team
            endpoint: `/v1/teams/${encodeURIComponent(String(input.team_id))}`,
            retries: 3
        });

        const body = z
            .object({
                team: OutputSchema
            })
            .parse(response.data);

        return body.team;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
