import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    teamId: z.number().describe('The ID of the team to update. Example: 2066772'),
    name: z.string().optional().describe('The new name for the team.'),
    operationsCoef: z.number().optional().describe('The new operations coefficient for the team.')
});

const ProviderTeamSchema = z
    .object({
        id: z.number(),
        name: z.string().optional().nullable(),
        organizationId: z.number().optional().nullable(),
        operationsCoef: z.number().optional().nullable(),
        transferCoef: z.number().optional().nullable()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.number().describe('The team ID.'),
    name: z.string().optional(),
    organizationId: z.number().optional(),
    operationsCoef: z.number().optional(),
    transferCoef: z.number().optional()
});

const action = createAction({
    description: "Update a team's name or operations limit.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['teams:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.make.com/api-documentation/
        const response = await nango.patch({
            endpoint: `/teams/${encodeURIComponent(String(input.teamId))}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.operationsCoef !== undefined && { operationsCoef: input.operationsCoef })
            },
            retries: 3
        });

        const providerData = z.object({ team: ProviderTeamSchema }).parse(response.data);
        const team = providerData.team;

        return {
            id: team.id,
            ...(team.name != null && { name: team.name }),
            ...(team.organizationId != null && { organizationId: team.organizationId }),
            ...(team.operationsCoef != null && { operationsCoef: team.operationsCoef }),
            ...(team.transferCoef != null && { transferCoef: team.transferCoef })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
