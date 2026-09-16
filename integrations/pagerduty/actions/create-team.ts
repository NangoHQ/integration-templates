import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        name: z.string().describe('The name of the team to create. Example: "Engineering"'),
        description: z.string().optional().describe('A description of the team.'),
        default_role: z.string().optional().describe('The default role assigned to new team members. Example: "manager"')
    })
    .describe('Input for creating a PagerDuty team.');

const ProviderTeamSchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().optional(),
    self: z.string().optional(),
    html_url: z.string().optional(),
    name: z.string(),
    description: z.string().nullable().optional(),
    default_role: z.string().optional(),
    parent: z
        .object({
            id: z.string(),
            type: z.string(),
            summary: z.string().optional(),
            self: z.string().optional(),
            html_url: z.string().optional()
        })
        .nullable()
        .optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the created team.'),
        name: z.string().describe('The name of the created team.'),
        description: z.string().optional().describe('The description of the created team.'),
        default_role: z.string().optional().describe('The default role for new team members.'),
        type: z.string().optional().describe('The PagerDuty resource type.'),
        summary: z.string().optional().describe('A short summary of the team.'),
        self: z.string().optional().describe('The API URL of the team resource.'),
        html_url: z.string().optional().describe('The PagerDuty web URL for the team.'),
        parent: z
            .object({
                id: z.string().describe('The unique identifier of the parent team.'),
                type: z.string().describe('The PagerDuty resource type of the parent.'),
                summary: z.string().optional().describe('A short summary of the parent team.'),
                self: z.string().optional().describe('The API URL of the parent team resource.'),
                html_url: z.string().optional().describe('The PagerDuty web URL for the parent team.')
            })
            .nullable()
            .optional()
            .describe('The parent team, if this team is nested.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp when the team was created.'),
        updated_at: z.string().optional().describe('ISO 8601 timestamp when the team was last updated.')
    })
    .describe('Output of a newly created PagerDuty team.');

/**
 * @tags: [write]
 * @tagReason: Creates a new team in PagerDuty.
 * @pitfalls: Duplicate team names are rejected with a 400 error.
 */
const action = createAction({
    description: 'Create a team.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['teams'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.pagerduty.com/api-reference/YXBpOjI3NDgyNjQ-create-a-team
            endpoint: '/teams',
            data: {
                team: {
                    type: 'team',
                    name: input.name,
                    ...(input.description !== undefined && { description: input.description }),
                    ...(input.default_role !== undefined && { default_role: input.default_role })
                }
            },
            retries: 10
        });

        const providerTeam = ProviderTeamSchema.parse(response.data.team);

        return {
            id: providerTeam.id,
            name: providerTeam.name,
            ...(providerTeam.description != null && { description: providerTeam.description }),
            ...(providerTeam.default_role !== undefined && { default_role: providerTeam.default_role }),
            ...(providerTeam.type !== undefined && { type: providerTeam.type }),
            ...(providerTeam.summary !== undefined && { summary: providerTeam.summary }),
            ...(providerTeam.self !== undefined && { self: providerTeam.self }),
            ...(providerTeam.html_url !== undefined && { html_url: providerTeam.html_url }),
            ...(providerTeam.parent !== undefined && {
                parent:
                    providerTeam.parent === null
                        ? null
                        : {
                              id: providerTeam.parent.id,
                              type: providerTeam.parent.type,
                              ...(providerTeam.parent.summary !== undefined && { summary: providerTeam.parent.summary }),
                              ...(providerTeam.parent.self !== undefined && { self: providerTeam.parent.self }),
                              ...(providerTeam.parent.html_url !== undefined && { html_url: providerTeam.parent.html_url })
                          }
            }),
            ...(providerTeam.created_at !== undefined && { created_at: providerTeam.created_at }),
            ...(providerTeam.updated_at !== undefined && { updated_at: providerTeam.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
