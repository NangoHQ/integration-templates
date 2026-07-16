import { z } from 'zod';
import { createAction } from 'nango';

const TeamMemberSchema = z.object({
    id: z.string(),
    given_name: z.string().optional(),
    family_name: z.string().optional(),
    email_address: z.string().optional(),
    phone_number: z.string().optional(),
    assigned_locations: z
        .object({
            assignment_type: z.string().optional(),
            location_ids: z.array(z.string()).optional()
        })
        .optional(),
    status: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const OutputSchema = z.object({
    team_members: z.array(TeamMemberSchema),
    cursor: z.string().optional().describe('Pagination cursor for the next page.')
});

const action = createAction({
    description: 'List/search team members.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['EMPLOYEES_READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.squareup.com/reference/square/team-api/search-team-members
            endpoint: '/v2/team-members/search',
            data: {
                ...(input.cursor && { cursor: input.cursor })
            },
            retries: 3
        });

        const payload = z
            .object({
                team_members: z.array(z.unknown()).optional().default([]),
                cursor: z.string().optional()
            })
            .parse(response.data);

        const teamMembers = payload.team_members.map((member: unknown) => TeamMemberSchema.parse(member));

        return {
            team_members: teamMembers,
            ...(payload.cursor != null && { cursor: payload.cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
