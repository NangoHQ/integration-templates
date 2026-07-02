import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    organizationId: z.string().describe('Organization ID. Example: "8242280"')
});

const TeamSchema = z.object({
    id: z.number(),
    name: z.string(),
    organizationId: z.number(),
    globalAgentsEnabled: z.boolean().optional()
});

const PgSchema = z.object({
    sortBy: z.string().optional(),
    sortDir: z.string().optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
    total: z.number().optional()
});

const ProviderResponseSchema = z.object({
    teams: z.array(TeamSchema),
    pg: PgSchema.optional()
});

const OutputSchema = z.object({
    teams: z.array(
        z.object({
            id: z.number(),
            name: z.string(),
            organizationId: z.number(),
            globalAgentsEnabled: z.boolean().optional()
        })
    ),
    pg: z
        .object({
            sortBy: z.string().optional(),
            sortDir: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
            total: z.number().optional()
        })
        .optional()
});

const action = createAction({
    description: 'List teams within an organization.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.make.com/api-documentation/teams/get-teams
            endpoint: '/teams',
            params: {
                organizationId: input.organizationId
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            teams: providerResponse.teams.map((team) => ({
                id: team.id,
                name: team.name,
                organizationId: team.organizationId,
                ...(team.globalAgentsEnabled !== undefined && { globalAgentsEnabled: team.globalAgentsEnabled })
            })),
            ...(providerResponse.pg !== undefined && { pg: providerResponse.pg })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
