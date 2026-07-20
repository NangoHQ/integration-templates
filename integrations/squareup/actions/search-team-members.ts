import { z } from 'zod';
import { createAction } from 'nango';

// Provider-response shape: Square can return these fields as explicit JSON null, not merely
// omit them (e.g. a cleared name/email/phone, or location_ids: null when assignment_type is
// ALL_CURRENT_AND_FUTURE_LOCATIONS). Parsing must accept null so it doesn't hard-throw; nulls
// are normalized away below when building each action output entry.
const ProviderTeamMemberSchema = z.object({
    id: z.string(),
    given_name: z.string().nullable().optional(),
    family_name: z.string().nullable().optional(),
    email_address: z.string().nullable().optional(),
    phone_number: z.string().nullable().optional(),
    assigned_locations: z
        .object({
            assignment_type: z.string().nullable().optional(),
            location_ids: z.array(z.string()).nullable().optional()
        })
        .nullable()
        .optional(),
    status: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

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

function normalizeTeamMember(member: z.infer<typeof ProviderTeamMemberSchema>): z.infer<typeof TeamMemberSchema> {
    return {
        id: member.id,
        ...(member.given_name != null && { given_name: member.given_name }),
        ...(member.family_name != null && { family_name: member.family_name }),
        ...(member.email_address != null && { email_address: member.email_address }),
        ...(member.phone_number != null && { phone_number: member.phone_number }),
        ...(member.status != null && { status: member.status }),
        ...(member.created_at != null && { created_at: member.created_at }),
        ...(member.updated_at != null && { updated_at: member.updated_at }),
        ...(member.assigned_locations != null && {
            assigned_locations: {
                ...(member.assigned_locations.assignment_type != null && { assignment_type: member.assigned_locations.assignment_type }),
                ...(member.assigned_locations.location_ids != null && { location_ids: member.assigned_locations.location_ids })
            }
        })
    };
}

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
                cursor: z.string().optional(),
                errors: z
                    .array(
                        z.object({
                            category: z.string().optional(),
                            code: z.string().optional(),
                            detail: z.string().optional(),
                            field: z.string().optional()
                        })
                    )
                    .optional()
            })
            .parse(response.data);

        if (payload.errors && payload.errors.length > 0) {
            const firstError = payload.errors[0];
            throw new nango.ActionError({
                type: firstError?.code ?? 'square_error',
                message: firstError?.detail ?? 'Square API returned an error.',
                category: firstError?.category,
                field: firstError?.field
            });
        }

        const teamMembers = payload.team_members.map((member: unknown) => normalizeTeamMember(ProviderTeamMemberSchema.parse(member)));

        return {
            team_members: teamMembers,
            ...(payload.cursor != null && { cursor: payload.cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
