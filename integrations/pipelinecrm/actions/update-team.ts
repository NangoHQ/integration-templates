import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    teamId: z.number().describe('Team ID. Example: 1429342'),
    name: z.string().describe('The new name for the team.')
});

const ProviderTeamSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    account_id: z.number().optional(),
    parent_id: z.number().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    permissions: z.unknown().optional(),
    height: z.number().optional(),
    depth: z.number().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    account_id: z.number().optional(),
    parent_id: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    permissions: z.unknown().optional(),
    height: z.number().optional(),
    depth: z.number().optional()
});

const action = createAction({
    description: "Update a team's name.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: `api/v3/admin/teams/${encodeURIComponent(String(input.teamId))}.json`,
            data: {
                team: {
                    name: input.name
                }
            },
            retries: 1
        });

        const providerTeam = ProviderTeamSchema.parse(response.data);

        return {
            id: providerTeam.id,
            ...(providerTeam.name !== undefined && { name: providerTeam.name }),
            ...(providerTeam.account_id !== undefined && { account_id: providerTeam.account_id }),
            ...(providerTeam.parent_id != null && { parent_id: providerTeam.parent_id }),
            ...(providerTeam.created_at !== undefined && { created_at: providerTeam.created_at }),
            ...(providerTeam.updated_at !== undefined && { updated_at: providerTeam.updated_at }),
            ...(providerTeam.permissions !== undefined && { permissions: providerTeam.permissions }),
            ...(providerTeam.height !== undefined && { height: providerTeam.height }),
            ...(providerTeam.depth !== undefined && { depth: providerTeam.depth })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
