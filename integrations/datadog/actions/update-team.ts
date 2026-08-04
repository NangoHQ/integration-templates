import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    team_id: z.string().trim().min(1).describe('The ID of the team to update. Example: "785d215c-9831-4702-8108-ff3b2db500c9"'),
    name: z.string().optional().describe('The new name for the team.'),
    handle: z.string().optional().describe('The new handle for the team.'),
    description: z.string().optional().describe('The new description for the team.')
});

const ProviderTeamSchema = z.object({
    data: z.object({
        id: z.string(),
        type: z.string(),
        attributes: z
            .object({
                name: z.string(),
                handle: z.string(),
                description: z.string().nullable().optional(),
                created_at: z.string().optional(),
                modified_at: z.string().optional()
            })
            .passthrough()
    })
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    handle: z.string(),
    description: z.string().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional()
});

const action = createAction({
    description: "Update a team's name, handle, or description.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['teams_read', 'teams_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const attributes = {
            ...(input.name !== undefined && { name: input.name }),
            ...(input.handle !== undefined && { handle: input.handle }),
            ...(input.description !== undefined && { description: input.description })
        };

        const config: ProxyConfiguration = {
            // https://docs.datadoghq.com/api/latest/teams/#update-a-team
            endpoint: `v2/team/${encodeURIComponent(input.team_id)}`,
            data: {
                data: {
                    id: input.team_id,
                    type: 'team',
                    attributes
                }
            },
            retries: 3
        };

        const response = await nango.patch(config);

        const providerTeam = ProviderTeamSchema.parse(response.data);
        const attrs = providerTeam.data.attributes;

        return {
            id: providerTeam.data.id,
            type: providerTeam.data.type,
            name: attrs.name,
            handle: attrs.handle,
            ...(attrs.description != null && { description: attrs.description }),
            ...(attrs.created_at !== undefined && { created_at: attrs.created_at }),
            ...(attrs.modified_at !== undefined && { modified_at: attrs.modified_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
