import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        user_id: z.string().describe('Unique identifier of the Ramp user to retrieve. Example: "36e09f48-aade-4603-8f6d-ecfc9c5eff2a"')
    })
    .describe('Identifier of the Ramp user to fetch.');

const CustomFieldSchema = z.object({
    name: z.string().describe('Name of the custom field. Example: "Cost Center"'),
    value: z.string().describe('Value of the custom field. Example: "R&D - Data"')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the user.'),
        business_id: z.string().nullable().describe('Unique identifier of the company the user works for.'),
        department_id: z.string().nullable().describe('Unique identifier of the department the user belongs to.'),
        email: z.string().describe('Email address of the user.'),
        employee_id: z.string().nullable().describe('Alternative identifier for the employee from an external system, usable in place of the email.'),
        entity_id: z.string().nullable().describe('Unique identifier of the business entity the user is associated with.'),
        first_name: z.string().describe('First name of the user.'),
        is_manager: z.boolean().describe('Whether the user is a manager.'),
        last_name: z.string().describe('Last name of the user.'),
        location_id: z.string().nullable().describe('Unique identifier of the location the user is assigned to.'),
        manager_id: z.string().nullable().describe('Unique identifier of the user who manages this user.'),
        phone: z.string().nullable().describe('Phone number of the user.'),
        role: z
            .enum([
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
            ])
            .describe('Role assigned to the user in Ramp.'),
        scheduled_deactivation_date: z.string().nullable().describe('Date when the user is scheduled to be deactivated, in ISO 8601 format.'),
        scheduled_invitation_date: z.string().nullable().describe('Date when a draft user is scheduled to be invited to Ramp, in ISO 8601 format.'),
        status: z
            .enum(['INVITE_EXPIRED', 'INVITE_PENDING', 'USER_ACTIVE', 'USER_DRAFT', 'USER_INACTIVE', 'USER_ONBOARDING', 'USER_SUSPENDED'])
            .describe('Current status of the user in Ramp.'),
        custom_fields: z.array(CustomFieldSchema).describe('Custom fields configured for the user.')
    })
    .describe('A single Ramp user.');

/**
 * @tags: [read]
 * @tagReason: Retrieves an existing Ramp user without modifying any provider state.
 */
const action = createAction({
    description: 'Retrieve a single Ramp user by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.ramp.com/developer-api/v1/api-reference/users/get-user
            endpoint: `/developer/v1/users/${encodeURIComponent(input.user_id)}`,
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
