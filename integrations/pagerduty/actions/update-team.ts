import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        team_id: z.string().describe('The unique identifier of the team to update.'),
        name: z.string().optional().describe('The new name for the team.'),
        description: z.string().nullable().optional().describe('The new description for the team. Pass null to clear the description.'),
        default_role: z
            .string()
            .optional()
            .describe(
                "The new default role for members of the team. Must be one of the valid PagerDuty role slugs such as 'admin', 'user', 'limited_user', 'observer', 'read_only_user', 'read_only_limited_user', 'team_responder', or 'restricted_access'."
            )
    })
    .describe('Input for updating a PagerDuty team.');

const ProviderTeamSchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().optional(),
    self: z.string().optional(),
    html_url: z.string().optional(),
    name: z.string(),
    description: z.string().nullable().optional(),
    default_role: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the updated team.'),
        type: z.string().describe('The type of the returned object.'),
        summary: z.string().optional().describe('A short summary of the team.'),
        self: z.string().optional().describe('The API URL of the team.'),
        html_url: z.string().optional().describe('The PagerDuty web URL of the team.'),
        name: z.string().describe('The name of the team.'),
        description: z.string().optional().describe('The description of the team.'),
        default_role: z.string().optional().describe('The default role for members of the team.'),
        created_at: z.string().optional().describe('The ISO 8601 timestamp when the team was created.'),
        updated_at: z.string().optional().describe('The ISO 8601 timestamp when the team was last updated.')
    })
    .describe('Output of an updated PagerDuty team.');

/**
 * @tags: [write]
 * @tagReason: Updates an existing team in PagerDuty by sending a PUT request to the provider API.
 */
const action = createAction({
    description: 'Update a PagerDuty team name, description, or default role.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['teams.write'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developer.pagerduty.com/api-reference/b3A6Mjc0ODEzMg-update-a-team
            endpoint: `/teams/${encodeURIComponent(input.team_id)}`,
            data: {
                team: {
                    type: 'team',
                    ...(input.name !== undefined && { name: input.name }),
                    ...(input.description !== undefined && { description: input.description }),
                    ...(input.default_role !== undefined && { default_role: input.default_role })
                }
            },
            retries: 3
        });

        const providerTeam = ProviderTeamSchema.parse(response.data.team);

        return {
            id: providerTeam.id,
            type: providerTeam.type,
            ...(providerTeam.summary !== undefined && { summary: providerTeam.summary }),
            ...(providerTeam.self !== undefined && { self: providerTeam.self }),
            ...(providerTeam.html_url !== undefined && { html_url: providerTeam.html_url }),
            name: providerTeam.name,
            ...(providerTeam.description != null && { description: providerTeam.description }),
            ...(providerTeam.default_role != null && { default_role: providerTeam.default_role }),
            ...(providerTeam.created_at !== undefined && { created_at: providerTeam.created_at }),
            ...(providerTeam.updated_at !== undefined && { updated_at: providerTeam.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
