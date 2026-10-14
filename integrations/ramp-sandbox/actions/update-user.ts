import { z } from 'zod';
import { createAction } from 'nango';

const RoleSchema = z.enum(['AUDITOR', 'BUSINESS_ADMIN', 'BUSINESS_BOOKKEEPER', 'BUSINESS_OWNER', 'BUSINESS_USER', 'GUEST_USER', 'IT_ADMIN']);

const InputSchema = z
    .object({
        user_id: z.string().describe('Unique identifier of the Ramp user to update. Example: "bde8334e-042e-4f39-9a5d-355ae17342e6".'),
        first_name: z.string().optional().describe('New first name for the user.'),
        last_name: z.string().optional().describe('New last name for the user.'),
        department_id: z.string().optional().describe('UUID of the department to assign to the user.'),
        location_id: z.string().optional().describe('UUID of the location to assign to the user.'),
        direct_manager_id: z.string().nullable().optional().describe("UUID of the user's direct manager. Pass null to clear the current manager."),
        role: RoleSchema.optional().describe('New role for the user. BUSINESS_OWNER is not a permissible value for updates.'),
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

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the updated user.'),
        business_id: z.string().nullable().optional().describe('Unique identifier of the business the user belongs to.'),
        email: z.string().optional().describe("The user's email address."),
        employee_id: z.string().nullable().optional().describe('External identifier for the employee, usable in place of the email.'),
        entity_id: z.string().nullable().optional().describe('Unique identifier of the business entity the user is associated with.'),
        first_name: z.string().optional().describe("The user's first name."),
        last_name: z.string().optional().describe("The user's last name."),
        department_id: z.string().nullable().optional().describe("Unique identifier of the user's department."),
        location_id: z.string().nullable().optional().describe("Unique identifier of the user's location."),
        manager_id: z.string().nullable().optional().describe("Unique identifier of the user's manager."),
        role: z.string().optional().describe("The user's role."),
        is_manager: z.boolean().optional().describe('Whether the user is a manager.'),
        phone: z.string().nullable().optional().describe("The user's phone number."),
        status: z.string().optional().describe('Lifecycle status of the user (for example USER_ACTIVE, USER_INACTIVE, or INVITE_PENDING).'),
        scheduled_deactivation_date: z
            .string()
            .nullable()
            .optional()
            .describe('ISO 8601 date-time when the user is scheduled to be deactivated, or null if none.'),
        scheduled_invitation_date: z
            .string()
            .nullable()
            .optional()
            .describe('ISO 8601 date-time when a draft user is scheduled to be invited, or null if none.'),
        custom_fields: z
            .array(
                z.object({
                    name: z.string().describe('Name of the custom field.'),
                    value: z.string().describe('Value of the custom field.')
                })
            )
            .optional()
            .describe('Custom field values configured for the user.')
    })
    .describe('The Ramp user after the update is applied.');

/**
 * @tags: [read, write]
 * @tagReason: Writes the requested changes to the provider and reads back the updated user to return its current state.
 * @pitfalls: Omitting a field leaves it unchanged, while passing null clears direct_manager_id or scheduled_deactivation_date; scheduled_deactivation_date cannot be set for admins or owners, and setting it can change the user's lifecycle status (observed flipping an inactive user to invite-pending) even after the date is cleared.
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

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
