import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    teamId: z.number().describe('Team ID. Example: 1429341')
});

const ProviderTeamSchema = z.object({
    id: z.number(),
    account_id: z.number(),
    name: z.string(),
    parent_id: z.number().nullable().optional(),
    permissions: z.record(z.string(), z.unknown()).optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    account_id: z.number(),
    name: z.string(),
    parent_id: z.number().optional(),
    permissions: z.record(z.string(), z.unknown()).optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Get a single team by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://app.pipelinecrm.com/openapi.yaml
            endpoint: `api/v3/admin/teams/${encodeURIComponent(String(input.teamId))}`,
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Team not found',
                teamId: input.teamId
            });
        }

        const providerTeam = ProviderTeamSchema.parse(response.data);

        return {
            id: providerTeam.id,
            account_id: providerTeam.account_id,
            name: providerTeam.name,
            ...(providerTeam.parent_id != null && { parent_id: providerTeam.parent_id }),
            ...(providerTeam.permissions !== undefined && { permissions: providerTeam.permissions }),
            ...(providerTeam.created_at !== undefined && { created_at: providerTeam.created_at }),
            ...(providerTeam.updated_at !== undefined && { updated_at: providerTeam.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
