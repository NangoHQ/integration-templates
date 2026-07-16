import { randomUUID } from 'crypto';
import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    given_name: z.string().describe('The given name (first name) of the team member. Example: "Ada"'),
    family_name: z.string().describe('The family name (last name) of the team member. Example: "Lovelace"'),
    idempotency_key: z.string().optional().describe('A unique idempotency key. If omitted, a random UUID is generated.'),
    reference_id: z.string().optional().describe('A second ID used to associate the team member with an entity in another system.'),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional().describe('The status of the team member.'),
    email_address: z.string().optional().describe('The email address associated with the team member.'),
    phone_number: z.string().optional().describe("The team member's phone number in E.164 format. Example: +14155552671"),
    assigned_locations: z
        .object({
            assignment_type: z.enum(['EXPLICIT_LOCATIONS', 'ALL_CURRENT_AND_FUTURE_LOCATIONS']),
            location_ids: z.array(z.string()).optional()
        })
        .optional()
        .describe("Describes the team member's assigned locations.")
});

const TeamMemberAssignedLocationsSchema = z.object({
    assignment_type: z.string().optional(),
    location_ids: z.array(z.string()).optional()
});

const TeamMemberSchema = z.object({
    id: z.string(),
    reference_id: z.string().optional(),
    is_owner: z.boolean().optional(),
    status: z.string().optional(),
    given_name: z.string().optional(),
    family_name: z.string().optional(),
    email_address: z.string().optional(),
    phone_number: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    assigned_locations: TeamMemberAssignedLocationsSchema.optional()
});

const ProviderResponseSchema = z.object({
    team_member: TeamMemberSchema.optional(),
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
});

const OutputSchema = z.object({
    id: z.string(),
    reference_id: z.string().optional(),
    is_owner: z.boolean().optional(),
    status: z.string().optional(),
    given_name: z.string().optional(),
    family_name: z.string().optional(),
    email_address: z.string().optional(),
    phone_number: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    assigned_locations: TeamMemberAssignedLocationsSchema.optional()
});

const action = createAction({
    description: 'Create a team member.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['EMPLOYEES_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const idempotencyKey = input.idempotency_key ?? randomUUID();

        const requestBody: Record<string, unknown> = {
            idempotency_key: idempotencyKey,
            team_member: {
                given_name: input.given_name,
                family_name: input.family_name,
                ...(input.reference_id !== undefined && { reference_id: input.reference_id }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.email_address !== undefined && { email_address: input.email_address }),
                ...(input.phone_number !== undefined && { phone_number: input.phone_number }),
                ...(input.assigned_locations !== undefined && { assigned_locations: input.assigned_locations })
            }
        };

        // https://developer.squareup.com/reference/square/team-api/create-team-member
        const response = await nango.post({
            endpoint: '/v2/team-members',
            data: requestBody,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.errors && parsed.errors.length > 0) {
            const firstError = parsed.errors[0];
            if (!firstError) {
                throw new nango.ActionError({
                    type: 'square_error',
                    message: 'Square API returned errors.'
                });
            }
            throw new nango.ActionError({
                type: firstError.code ?? 'square_error',
                message: firstError.detail ?? 'Square API returned an error.',
                category: firstError.category,
                field: firstError.field
            });
        }

        if (!parsed.team_member) {
            throw new nango.ActionError({
                type: 'missing_team_member',
                message: 'Square API did not return a team_member in the response.'
            });
        }

        return {
            id: parsed.team_member.id,
            ...(parsed.team_member.reference_id !== undefined && { reference_id: parsed.team_member.reference_id }),
            ...(parsed.team_member.is_owner !== undefined && { is_owner: parsed.team_member.is_owner }),
            ...(parsed.team_member.status !== undefined && { status: parsed.team_member.status }),
            ...(parsed.team_member.given_name !== undefined && { given_name: parsed.team_member.given_name }),
            ...(parsed.team_member.family_name !== undefined && { family_name: parsed.team_member.family_name }),
            ...(parsed.team_member.email_address !== undefined && { email_address: parsed.team_member.email_address }),
            ...(parsed.team_member.phone_number !== undefined && { phone_number: parsed.team_member.phone_number }),
            ...(parsed.team_member.created_at !== undefined && { created_at: parsed.team_member.created_at }),
            ...(parsed.team_member.updated_at !== undefined && { updated_at: parsed.team_member.updated_at }),
            ...(parsed.team_member.assigned_locations !== undefined && { assigned_locations: parsed.team_member.assigned_locations })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
