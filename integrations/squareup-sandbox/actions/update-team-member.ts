import { z } from 'zod';
import { createAction } from 'nango';

const AssignedLocationsSchema = z.object({
    assignment_type: z.enum(['EXPLICIT_LOCATIONS', 'ALL_CURRENT_AND_FUTURE_LOCATIONS']),
    explicit_location_ids: z.array(z.string()).optional()
});

const InputSchema = z.object({
    team_member_id: z.string().describe('The ID of the team member to update. Example: "TMAj3tlDagDQmCFz"'),
    given_name: z.string().optional().describe('The given name (first name) of the team member.'),
    family_name: z.string().optional().describe('The family name (last name) of the team member.'),
    email_address: z.string().optional().describe('The email address of the team member.'),
    phone_number: z.string().optional().describe('The phone number of the team member in E.164 format.'),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional().describe('The status of the team member.'),
    assigned_locations: AssignedLocationsSchema.optional().describe('The locations the team member is assigned to.')
});

const ProviderTeamMemberSchema = z.object({
    id: z.string(),
    given_name: z.string().nullable().optional(),
    family_name: z.string().nullable().optional(),
    email_address: z.string().nullable().optional(),
    phone_number: z.string().nullable().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    assigned_locations: AssignedLocationsSchema.nullable().optional()
});

const ProviderResponseSchema = z.object({
    team_member: ProviderTeamMemberSchema
});

const OutputSchema = z.object({
    id: z.string(),
    given_name: z.string().optional(),
    family_name: z.string().optional(),
    email_address: z.string().optional(),
    phone_number: z.string().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    assigned_locations: AssignedLocationsSchema.optional()
});

const action = createAction({
    description: 'Update a team member (e.g. name, status, assigned locations).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['EMPLOYEES_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = {
            team_member: {
                ...(input.given_name !== undefined && { given_name: input.given_name }),
                ...(input.family_name !== undefined && { family_name: input.family_name }),
                ...(input.email_address !== undefined && { email_address: input.email_address }),
                ...(input.phone_number !== undefined && { phone_number: input.phone_number }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.assigned_locations !== undefined && { assigned_locations: input.assigned_locations })
            }
        };

        const response = await nango.put({
            // https://developer.squareup.com/reference/square/team/update-team-member
            endpoint: `/v2/team-members/${encodeURIComponent(input.team_member_id)}`,
            data: body,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Team member not found or update failed.'
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const member = providerResponse.team_member;

        return {
            id: member.id,
            ...(member.given_name != null && { given_name: member.given_name }),
            ...(member.family_name != null && { family_name: member.family_name }),
            ...(member.email_address != null && { email_address: member.email_address }),
            ...(member.phone_number != null && { phone_number: member.phone_number }),
            ...(member.status !== undefined && { status: member.status }),
            ...(member.assigned_locations != null && { assigned_locations: member.assigned_locations })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
