import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const UserSchema = z.object({
    id: z.string().describe('Unique identifier of the user. Example: "bde8334e-042e-4f39-9a5d-355ae17342e6"'),
    business_id: z.string().nullable().describe('Unique identifier of the business the user belongs to.'),
    first_name: z.string().describe('First name of the employee.'),
    last_name: z.string().describe('Last name of the employee.'),
    email: z.string().describe('Email address of the employee.'),
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
        .describe('Role of the employee within the business.'),
    status: z
        .enum(['INVITE_EXPIRED', 'INVITE_PENDING', 'USER_ACTIVE', 'USER_DRAFT', 'USER_INACTIVE', 'USER_ONBOARDING', 'USER_SUSPENDED'])
        .describe('Current status of the user account.'),
    is_manager: z.boolean().describe('Whether the employee is a manager.'),
    employee_id: z.string().nullable().describe('Alternative employee identifier coming from an external system, if any.'),
    entity_id: z.string().nullable().describe('Unique identifier of the business entity the user is associated with.'),
    department_id: z.string().nullable().describe('Unique identifier of the department the user belongs to.'),
    location_id: z.string().nullable().describe('Unique identifier of the location assigned to the user.'),
    manager_id: z.string().nullable().describe('Unique identifier of the manager of this user.'),
    phone: z.string().nullable().describe('Phone number of the employee.'),
    scheduled_deactivation_date: z.string().nullable().describe('ISO 8601 date when the user is scheduled to be deactivated, or null.'),
    scheduled_invitation_date: z.string().nullable().describe('ISO 8601 date when the user is scheduled to be invited, or null.'),
    custom_fields: z
        .array(
            z.object({
                name: z.string().describe('Name of the custom field.'),
                value: z.string().describe('Value of the custom field.')
            })
        )
        .describe('Custom fields defined for the user.')
});

const UsersResponseSchema = z.object({
    data: z.array(UserSchema),
    page: z.object({
        next: z.string().nullable()
    })
});

const InputSchema = z
    .object({
        cursor: z
            .string()
            .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, 'cursor must be a user ID returned in a previous response')
            .optional()
            .describe('Pagination cursor: the ID of the last user from the previous page. Omit for the first page.'),
        page_size: z.number().int().min(2).max(100).optional().describe('Number of users to return per page, between 2 and 100. Defaults to 20.'),
        email: z.string().optional().describe('Filter by the employee email address.'),
        role: z
            .enum(['AUDITOR', 'BUSINESS_ADMIN', 'BUSINESS_BOOKKEEPER', 'BUSINESS_OWNER', 'BUSINESS_USER', 'GUEST_USER', 'IT_ADMIN'])
            .optional()
            .describe('Filter by employee role.'),
        status: z
            .enum(['USER_ACTIVE', 'USER_DRAFT', 'USER_INACTIVE', 'USER_SUSPENDED'])
            .optional()
            .describe('Filter by account status. When omitted, active and inactive users are returned but suspended users are excluded.'),
        department_id: z.string().optional().describe('Filter by department ID.'),
        location_id: z.string().optional().describe('Filter by location ID.'),
        entity_id: z.string().optional().describe('Filter by business entity ID.'),
        employee_id: z.string().optional().describe('Filter by the external employee identifier.')
    })
    .describe('Filters and pagination for listing users on the business.');

const OutputSchema = z
    .object({
        users: z.array(UserSchema).describe('Users returned for the requested page.'),
        next_cursor: z.string().optional().describe('Cursor to pass as "cursor" to fetch the next page. Absent when there are no more pages.')
    })
    .describe('A page of users on the business, plus the cursor for the next page.');

function getNextCursor(nextPage: string | null): string | undefined {
    if (nextPage === null) {
        return undefined;
    }

    const start = new URL(nextPage, 'https://api.ramp.com').searchParams.get('start');

    if (start === null || start.length === 0) {
        return undefined;
    }

    return start;
}

/**
 * @tags: [read]
 * @tagReason: Lists users from the business without modifying any provider state.
 * @pitfalls: Omitting status silently drops suspended users while still returning inactive, draft, and invite-pending accounts, so pass status to narrow the result; reads are served from a replica, so very recent user changes may not appear immediately.
 */
const action = createAction({
    description: 'List employees/users on the business.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.ramp.com/openapi/developer-api.json (GET /developer/v1/users)
            endpoint: '/developer/v1/users',
            params: {
                ...(input.email !== undefined && { email: input.email }),
                ...(input.role !== undefined && { role: input.role }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.department_id !== undefined && { department_id: input.department_id }),
                ...(input.location_id !== undefined && { location_id: input.location_id }),
                ...(input.entity_id !== undefined && { entity_id: input.entity_id }),
                ...(input.employee_id !== undefined && { employee_id: input.employee_id }),
                ...(input.page_size !== undefined && { page_size: input.page_size }),
                ...(input.cursor !== undefined && { start: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get<unknown>(config);
        const parsed = UsersResponseSchema.parse(response.data);
        const nextCursor = getNextCursor(parsed.page.next);

        return {
            users: parsed.data,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
