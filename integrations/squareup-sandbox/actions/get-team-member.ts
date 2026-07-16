import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    team_member_id: z.string().describe('The ID of the team member to retrieve. Example: "TMAj3tlDagDQmCFz"')
});

const ProviderTeamMemberSchema = z
    .object({
        id: z.string(),
        given_name: z.string().optional(),
        family_name: z.string().optional(),
        status: z.string().optional(),
        assigned_locations: z
            .object({
                assignment_type: z.string().optional(),
                location_ids: z.array(z.string()).optional()
            })
            .optional(),
        email_address: z.string().optional(),
        phone_number: z.string().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const OutputSchema = ProviderTeamMemberSchema;

const action = createAction({
    description: 'Retrieve a team member.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['EMPLOYEES_READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.squareup.com/reference/square/team-api/get-team-member
            endpoint: `/v2/team-members/${encodeURIComponent(input.team_member_id)}`,
            retries: 3
        });

        const GetTeamMemberResponseSchema = z.object({
            team_member: ProviderTeamMemberSchema
        });

        const parsed = GetTeamMemberResponseSchema.parse(response.data);

        if (!parsed.team_member) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Team member not found',
                team_member_id: input.team_member_id
            });
        }

        return parsed.team_member;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
