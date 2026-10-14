import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        user_id: z.string().describe('Unique identifier of the Ramp user to retrieve. Example: "36e09f48-aade-4603-8f6d-ecfc9c5eff2a"')
    })
    .describe('Identifier of the Ramp user to fetch.');

const RoleSchema = z.enum([
    'AUDITOR',
    'BUSINESS_ADMIN',
    'BUSINESS_BOOKKEEPER',
    'BUSINESS_OWNER',
    'BUSINESS_USER',
    'GUEST_USER',
    'IT_ADMIN',
    'UNBUNDLED_ADMIN',
    'UNBUNDLED_BOOKKEEPER',
    'UNBUNDLED_OWNER',
    'UNBUNDLED_USER'
]);

const StatusSchema = z.enum(['INVITE_EXPIRED', 'INVITE_PENDING', 'USER_ACTIVE', 'USER_DRAFT', 'USER_INACTIVE', 'USER_ONBOARDING', 'USER_SUSPENDED']);

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
    role: RoleSchema.optional(),
    scheduled_deactivation_date: z.string().nullable(),
    scheduled_invitation_date: z.string().nullable(),
    status: StatusSchema,
    custom_fields: z.array(
        z.object({
            name: z.string(),
            value: z.string()
        })
    )
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the user.'),
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
        role: RoleSchema.optional().describe('Role assigned to the user in Ramp.'),
        scheduled_deactivation_date: z
            .string()
            .optional()
            .describe('Date when the user is scheduled to be deactivated, in ISO 8601 format. Omitted when none is scheduled.'),
        scheduled_invitation_date: z
            .string()
            .optional()
            .describe('Date when a draft user is scheduled to be invited to Ramp, in ISO 8601 format. Omitted when none is scheduled.'),
        status: StatusSchema.describe('Current status of the user in Ramp.'),
        custom_fields: z
            .array(
                z.object({
                    name: z.string().describe('Name of the custom field. Example: "Cost Center"'),
                    value: z.string().describe('Value of the custom field. Example: "R&D - Data"')
                })
            )
            .describe('Custom fields configured for the user.')
    })
    .describe('A single Ramp user.');

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
 * @tags: [read]
 * @tagReason: Retrieves an existing Ramp user without modifying any provider state.
 * @pitfalls: Fields Ramp returns as null (department, location, manager, phone, employee_id, scheduled dates) are omitted from the output rather than returned as null.
 */
const action = createAction({
    description: 'Retrieve a single Ramp user by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.ramp.com/developer-api/v1/api-reference/users/get-user
            endpoint: `/developer/v1/users/${encodeURIComponent(input.user_id)}`,
            retries: 3
        });

        return toUser(ProviderUserSchema.parse(response.data));
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
