import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the team to retrieve. Example: "P2J4L5K"')
    })
    .describe('Input to retrieve a single PagerDuty team by its unique identifier.');

const ParentTeamSchema = z.object({
    id: z.string().describe('The unique identifier of the parent team.'),
    type: z.string().describe('The type of the parent team reference.'),
    summary: z.string().optional().describe('A short summary of the parent team.'),
    self: z.string().optional().describe('The API URL of the parent team.'),
    html_url: z.string().optional().describe('The PagerDuty web URL of the parent team.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the team.'),
        name: z.string().describe('The name of the team.'),
        description: z.string().optional().describe('The description of the team.'),
        type: z.string().describe('The type of the resource.'),
        summary: z.string().optional().describe('A short summary of the team.'),
        self: z.string().optional().describe('The API URL of the team.'),
        html_url: z.string().optional().describe('The PagerDuty web URL of the team.'),
        parent: ParentTeamSchema.optional().describe('The parent team, if this team is a subteam.'),
        default_role: z.string().optional().describe('The default role for users in this team.'),
        version: z.number().optional().describe('The version number used for optimistic locking.')
    })
    .describe('Output representing a single PagerDuty team, including optional parent reference and metadata fields.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single team by ID from the PagerDuty API.
 */
const action = createAction({
    description: 'Retrieve a single team.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.pagerduty.com/api-reference/
            endpoint: `/teams/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const raw = response.data;
        if (!raw || typeof raw !== 'object' || !('team' in raw)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response structure from PagerDuty API.'
            });
        }

        const teamSchema = z.object({
            team: z.object({
                id: z.string(),
                name: z.string(),
                description: z.string().nullish(),
                type: z.string(),
                summary: z.string().nullish(),
                self: z.string().nullish(),
                html_url: z.string().nullish(),
                parent: z
                    .object({
                        id: z.string(),
                        type: z.string(),
                        summary: z.string().nullish(),
                        self: z.string().nullish(),
                        html_url: z.string().nullish()
                    })
                    .nullish(),
                default_role: z.string().nullish(),
                version: z.number().nullish()
            })
        });

        const parsed = teamSchema.parse(raw);
        const team = parsed.team;

        return {
            id: team.id,
            name: team.name,
            ...(team.description != null && { description: team.description }),
            type: team.type,
            ...(team.summary != null && { summary: team.summary }),
            ...(team.self != null && { self: team.self }),
            ...(team.html_url != null && { html_url: team.html_url }),
            ...(team.parent != null && {
                parent: {
                    id: team.parent.id,
                    type: team.parent.type,
                    ...(team.parent.summary != null && { summary: team.parent.summary }),
                    ...(team.parent.self != null && { self: team.parent.self }),
                    ...(team.parent.html_url != null && { html_url: team.parent.html_url })
                }
            }),
            ...(team.default_role != null && { default_role: team.default_role }),
            ...(team.version != null && { version: team.version })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
