import { z } from 'zod';
import { createAction } from 'nango';

// BUSINESS_OWNER is excluded: Ramp rejects it on update with 403 BUSINESS_7022 "Owner is not an assignable role for this business".
const RoleSchema = z.enum(['AUDITOR', 'BUSINESS_ADMIN', 'BUSINESS_BOOKKEEPER', 'BUSINESS_USER', 'GUEST_USER', 'IT_ADMIN']);

const InputSchema = z
    .object({
        user_id: z.string().describe('Unique identifier of the Ramp user to update. Example: "bde8334e-042e-4f39-9a5d-355ae17342e6".'),
        first_name: z.string().optional().describe('New first name for the user.'),
        last_name: z.string().optional().describe('New last name for the user.'),
        department_id: z.string().optional().describe('UUID of the department to assign to the user.'),
        location_id: z.string().optional().describe('UUID of the location to assign to the user.'),
        direct_manager_id: z.string().nullable().optional().describe("UUID of the user's direct manager. Pass null to clear the current manager."),
        role: RoleSchema.optional().describe('New role for the user. BUSINESS_OWNER cannot be assigned through this action.'),
        is_manager: z.boolean().optional().describe('Whether the user is a manager.'),
        auto_promote: z.boolean().optional().describe("Whether to automatically promote the user's manager to manager."),
        scheduled_deactivation_date: z
            .string()
            .nullable()
            .optional()
            .describe(
                'Date (YYYY-MM-DD) to schedule the user for deactivation. Pass null to clear a scheduled deactivation. Cannot be set for admins or owners.'
            )
    })
    .describe('Fields to update on a Ramp user. Only the provided fields are changed.');

// https://docs.ramp.com/openapi/developer-api.json - User
const ProviderUserSchema = z.object({
    id: z.string(),
    business_id: z.string().nullable(),
    department_id: z.string().nullable(),
    email: z.string().optional(),
    employee_id: z.string().nullable(),
    entity_id: z.string().nullable(),
    first_name: z.string().optional(),
    is_manager: z.boolean(),
    last_name: z.string().optional(),
    location_id: z.string().nullable(),
    manager_id: z.string().nullable(),
    phone: z.string().nullable(),
    role: z.string().optional(),
    scheduled_deactivation_date: z.string().nullable(),
    scheduled_invitation_date: z.string().nullable(),
    status: z.string(),
    custom_fields: z.array(
        z.object({
            name: z.string(),
            value: z.string()
        })
    )
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the updated user.'),
        business_id: z.string().optional().describe('Unique identifier of the company the user works for.'),
        department_id: z.string().optional().describe('Unique identifier of the department the user belongs to. Omitted when unassigned.'),
        email: z.string().optional().describe('Email address of the user.'),
        employee_id: z
            .string()
            .optional()
            .describe('Alternative identifier for the employee from an external system, usable in place of the email. Omitted when not set.'),
        entity_id: z.string().optional().describe('Unique identifier of the business entity the user is associated with. Omitted when not set.'),
        first_name: z.string().optional().describe('First name of the user.'),
        is_manager: z.boolean().describe('Whether the user is a manager.'),
        last_name: z.string().optional().describe('Last name of the user.'),
        location_id: z.string().optional().describe('Unique identifier of the location the user is assigned to. Omitted when unassigned.'),
        manager_id: z.string().optional().describe('Unique identifier of the user who manages this user. Omitted when the user has no manager.'),
        phone: z.string().optional().describe('Phone number of the user. Omitted when not set.'),
        role: z
            .string()
            .optional()
            .describe(
                'Role assigned to the user in Ramp: AUDITOR, BUSINESS_ADMIN, BUSINESS_BOOKKEEPER, BUSINESS_OWNER, BUSINESS_USER, GUEST_USER, IT_ADMIN, or an UNBUNDLED_* role.'
            ),
        scheduled_deactivation_date: z
            .string()
            .optional()
            .describe('Date when the user is scheduled to be deactivated, in ISO 8601 format. Omitted when none is scheduled.'),
        scheduled_invitation_date: z
            .string()
            .optional()
            .describe('Date when a draft user is scheduled to be invited to Ramp, in ISO 8601 format. Omitted when none is scheduled.'),
        status: z
            .string()
            .describe(
                'Current status of the user: INVITE_EXPIRED, INVITE_PENDING, USER_ACTIVE, USER_DRAFT, USER_INACTIVE, USER_ONBOARDING, or USER_SUSPENDED.'
            ),
        custom_fields: z
            .array(
                z.object({
                    name: z.string().describe('Name of the custom field. Example: "Cost Center"'),
                    value: z.string().describe('Value of the custom field. Example: "R&D - Data"')
                })
            )
            .describe('Custom fields configured for the user.')
    })
    .describe('The Ramp user after the update is applied.');

function toUser(user: z.infer<typeof ProviderUserSchema>): z.infer<typeof OutputSchema> {
    return {
        id: user.id,
        ...(user.business_id != null && { business_id: user.business_id }),
        ...(user.department_id != null && { department_id: user.department_id }),
        ...(user.email != null && { email: user.email }),
        ...(user.employee_id != null && { employee_id: user.employee_id }),
        ...(user.entity_id != null && { entity_id: user.entity_id }),
        ...(user.first_name != null && { first_name: user.first_name }),
        is_manager: user.is_manager,
        ...(user.last_name != null && { last_name: user.last_name }),
        ...(user.location_id != null && { location_id: user.location_id }),
        ...(user.manager_id != null && { manager_id: user.manager_id }),
        ...(user.phone != null && { phone: user.phone }),
        ...(user.role != null && { role: user.role }),
        ...(user.scheduled_deactivation_date != null && { scheduled_deactivation_date: user.scheduled_deactivation_date }),
        ...(user.scheduled_invitation_date != null && { scheduled_invitation_date: user.scheduled_invitation_date }),
        status: user.status,
        custom_fields: user.custom_fields
    };
}

/**
 * @tags: [read, write]
 * @tagReason: Writes the requested changes to the provider and reads back the updated user to return its current state.
 * @pitfalls: Omitting a field leaves it unchanged, while passing null clears direct_manager_id or scheduled_deactivation_date; scheduled_deactivation_date cannot be set for admins or owners, and setting it can change the user's lifecycle status (observed flipping an inactive user to invite-pending) even after the date is cleared. Fields Ramp returns as null are omitted from the output.
 */
const action = createAction({
    description: "Update a user's name, department, location, manager, or role.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users:write', 'users:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data = {
            ...(input.first_name !== undefined && { first_name: input.first_name }),
            ...(input.last_name !== undefined && { last_name: input.last_name }),
            ...(input.department_id !== undefined && { department_id: input.department_id }),
            ...(input.location_id !== undefined && { location_id: input.location_id }),
            ...(input.direct_manager_id !== undefined && { direct_manager_id: input.direct_manager_id }),
            ...(input.role !== undefined && { role: input.role }),
            ...(input.is_manager !== undefined && { is_manager: input.is_manager }),
            ...(input.auto_promote !== undefined && { auto_promote: input.auto_promote }),
            ...(input.scheduled_deactivation_date !== undefined && { scheduled_deactivation_date: input.scheduled_deactivation_date })
        };

        // https://docs.ramp.com/developer-api/v1/api/users
        await nango.patch<unknown>({
            endpoint: `/developer/v1/users/${encodeURIComponent(input.user_id)}`,
            data,
            retries: 3
        });

        // https://docs.ramp.com/developer-api/v1/api/users
        const response = await nango.get<unknown>({
            endpoint: `/developer/v1/users/${encodeURIComponent(input.user_id)}`,
            retries: 3
        });

        return toUser(ProviderUserSchema.parse(response.data));
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
