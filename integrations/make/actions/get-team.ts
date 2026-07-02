import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    teamId: z.number().describe('Team ID. Example: 2066772')
});

const ProviderTeamSchema = z.object({
    id: z.number(),
    name: z.string(),
    organizationId: z.number(),
    globalAgentsEnabled: z.boolean()
});

const ProviderResponseSchema = z.object({
    team: ProviderTeamSchema
});

const OutputSchema = z.object({
    team: z.object({
        id: z.number(),
        name: z.string(),
        organizationId: z.number(),
        globalAgentsEnabled: z.boolean()
    })
});

const action = createAction({
    description: 'Retrieve details of a single team.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.make.com/api-documentation/teams/get-teams-teamid
        const response = await nango.get({
            endpoint: `/teams/${encodeURIComponent(input.teamId)}`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            team: {
                id: providerResponse.team.id,
                name: providerResponse.team.name,
                organizationId: providerResponse.team.organizationId,
                globalAgentsEnabled: providerResponse.team.globalAgentsEnabled
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
