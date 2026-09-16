import { z } from 'zod';
import { createAction } from 'nango';

const ListTeamMembersInputSchema = z
    .object({
        team_id: z.string().describe('The unique identifier of the team. Example: "PRVALT5"'),
        limit: z.number().optional().describe('Maximum number of members to return per page. Defaults to the provider limit.'),
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
    })
    .describe('Input to list the members of a PagerDuty team.');

const TeamMemberSchema = z.object({
    id: z.string().describe('The unique identifier of the user.'),
    name: z.string().optional().describe('The display name of the user.'),
    role: z.string().describe('The role of the user within the team. Example: "manager".')
});

const ListTeamMembersOutputSchema = z
    .object({
        members: z.array(TeamMemberSchema).describe('The list of team members returned for the current page.'),
        next_cursor: z.string().optional().describe('Pagination cursor to fetch the next page. Omitted when there are no more pages.')
    })
    .describe('Output containing a page of team members and an optional cursor for pagination.');

const ProviderUserSchema = z.object({
    id: z.string(),
    summary: z.string().optional()
});

const ProviderMemberSchema = z.object({
    user: ProviderUserSchema,
    role: z.string()
});

const ProviderResponseSchema = z.object({
    members: z.array(ProviderMemberSchema),
    limit: z.number(),
    offset: z.number(),
    more: z.boolean()
});

/**
 * @tags: [read]
 * @tagReason: Retrieves the list of members associated with a team.
 * @pitfalls: The account must have the Teams feature enabled; each member's user object is a lightweight reference containing only id and summary, so full profile details like email are unavailable from this endpoint.
 */
const action = createAction({
    description: 'List the members of a team.',
    version: '1.0.0',
    input: ListTeamMembersInputSchema,
    output: ListTeamMembersOutputSchema,
    scopes: ['teams.read'],

    exec: async (nango, input): Promise<z.infer<typeof ListTeamMembersOutputSchema>> => {
        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (input.cursor && isNaN(offset)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a numeric offset string.'
            });
        }

        const response = await nango.get({
            // https://developer.pagerduty.com/api-reference/
            endpoint: `/teams/${encodeURIComponent(input.team_id)}/members`,
            params: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(offset > 0 && { offset: offset })
            },
            retries: 3
        });

        const raw = ProviderResponseSchema.parse(response.data);

        const members = raw.members.map((member) => ({
            id: member.user.id,
            ...(member.user.summary !== undefined && { name: member.user.summary }),
            role: member.role
        }));

        return {
            members,
            ...(raw.more && { next_cursor: String(raw.offset + raw.limit) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
