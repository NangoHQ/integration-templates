import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderTeamSchema = z
    .object({
        _id: z.string(),
        name: z.string(),
        companyId: z.string().optional(),
        project: z.boolean().optional(),
        deleted: z.boolean().optional()
    })
    .passthrough();

const TeamSchema = z.object({
    teamId: z.string(),
    name: z.string(),
    companyId: z.string().optional(),
    project: z.boolean().optional(),
    deleted: z.boolean().optional()
});

const OutputSchema = z.object({
    teams: z.array(TeamSchema)
});

const action = createAction({
    description: 'List teams visible to the authenticated user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://help.ninety.io/en/articles/15505694-api-reference-and-access
            endpoint: '/v1/teams',
            retries: 3
        });

        const rawTeams = z.array(z.unknown()).parse(response.data);

        const teams = rawTeams.map((item: unknown) => {
            const providerTeam = ProviderTeamSchema.parse(item);
            return {
                teamId: providerTeam._id,
                name: providerTeam.name,
                ...(providerTeam.companyId !== undefined && { companyId: providerTeam.companyId }),
                ...(providerTeam.project !== undefined && { project: providerTeam.project }),
                ...(providerTeam.deleted !== undefined && { deleted: providerTeam.deleted })
            };
        });

        return { teams };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
