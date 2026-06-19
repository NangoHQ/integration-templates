import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderTeamUserSchema = z.object({
    user_id: z.string(),
    team_id: z.string()
});

const ProviderResponseSchema = z.object({
    team_user: ProviderTeamUserSchema
});

const OutputSchema = z.object({
    user_id: z.string().describe('The ID of the user.'),
    team_id: z.string().describe("The ID of the user's Canva Team.")
});

const action = createAction({
    description: 'Retrieve the current Canva user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user:read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.canva.dev/docs/connect/api-reference/users/
        const response = await nango.get({
            endpoint: '/rest/v1/users/me',
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            user_id: parsed.team_user.user_id,
            team_id: parsed.team_user.team_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
