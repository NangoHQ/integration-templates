import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    team_id: z.number().describe('Team ID. Example: 244844'),
    user_id: z.number().describe('User ID. Example: 1981305')
});

const ProviderTeamUserSchema = z.object({
    id: z.number(),
    direct_link: z.string(),
    name: z.string(),
    email: z.string(),
    created_at: z.string(),
    time_zone: z.string()
});

const ProviderTeamSchema = z.object({
    id: z.number(),
    name: z.string(),
    direct_link: z.string(),
    created_at: z.string(),
    users: z.array(ProviderTeamUserSchema)
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    direct_link: z.string(),
    created_at: z.string(),
    users: z.array(
        z.object({
            id: z.number(),
            direct_link: z.string(),
            name: z.string(),
            email: z.string(),
            created_at: z.string(),
            time_zone: z.string()
        })
    )
});

const action = createAction({
    description: 'Add a user to an Aircall team.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public_api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.aircall.io/api-references/#add-a-user-to-a-team
            endpoint: `/v1/teams/${encodeURIComponent(input.team_id)}/users/${encodeURIComponent(input.user_id)}`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Aircall API.'
            });
        }

        const ProviderResponseSchema = z.object({
            team: ProviderTeamSchema
        });

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Response did not contain a valid team object.'
            });
        }

        const providerTeam = parsedResponse.data.team;

        return {
            id: providerTeam.id,
            name: providerTeam.name,
            direct_link: providerTeam.direct_link,
            created_at: providerTeam.created_at,
            users: providerTeam.users.map((user) => ({
                id: user.id,
                direct_link: user.direct_link,
                name: user.name,
                email: user.email,
                created_at: user.created_at,
                time_zone: user.time_zone
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
