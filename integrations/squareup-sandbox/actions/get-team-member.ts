import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    team_member_id: z.string().describe('The ID of the team member to retrieve. Example: "TMAj3tlDagDQmCFz"')
});

// Provider-response shape: Square can return these fields as explicit JSON null (e.g. a
// cleared name/email/phone, or location_ids: null when assignment_type is
// ALL_CURRENT_AND_FUTURE_LOCATIONS), not merely omit them. Parsing must accept null so it
// doesn't hard-throw; nulls are normalized away below when building the action output.
const ProviderTeamMemberSchema = z
    .object({
        id: z.string(),
        given_name: z.string().nullable().optional(),
        family_name: z.string().nullable().optional(),
        status: z.string().nullable().optional(),
        assigned_locations: z
            .object({
                assignment_type: z.string().nullable().optional(),
                location_ids: z.array(z.string()).nullable().optional()
            })
            .nullable()
            .optional(),
        email_address: z.string().nullable().optional(),
        phone_number: z.string().nullable().optional(),
        created_at: z.string().nullable().optional(),
        updated_at: z.string().nullable().optional()
    })
    .passthrough();

// Kept as .passthrough() (matching the pre-existing behavior of this action) so fields not
// explicitly modeled here (e.g. is_owner, merchant_id, wage_setting) still flow through to
// the caller unchanged.
const OutputSchema = z
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
            team_member: ProviderTeamMemberSchema.optional()
        });

        const parsed = GetTeamMemberResponseSchema.parse(response.data);

        if (!parsed.team_member) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Team member not found',
                team_member_id: input.team_member_id
            });
        }

        const { given_name, family_name, status, email_address, phone_number, assigned_locations, created_at, updated_at, ...rest } = parsed.team_member;

        return {
            ...rest,
            ...(given_name != null && { given_name }),
            ...(family_name != null && { family_name }),
            ...(status != null && { status }),
            ...(email_address != null && { email_address }),
            ...(phone_number != null && { phone_number }),
            ...(created_at != null && { created_at }),
            ...(updated_at != null && { updated_at }),
            ...(assigned_locations != null && {
                assigned_locations: {
                    ...(assigned_locations.assignment_type != null && { assignment_type: assigned_locations.assignment_type }),
                    ...(assigned_locations.location_ids != null && { location_ids: assigned_locations.location_ids })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
